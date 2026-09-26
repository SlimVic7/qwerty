const fs = require('fs');
let content = fs.readFileSync('server/routes/cvParsing.ts', 'utf-8');

// Replace the GET /:id/assessment route
content = content.replace(/cvParsingRouter\.get\('\/:id\/assessment', async \(req, res\) => \{[\s\S]*?(?=cvParsingRouter\.post\('\/:id\/assessment')/g, 
`cvParsingRouter.get('/:id/assessment', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const cvId = req.params.id; // cv_version_id

    // No need to query candidate_cv_versions first, just get the latest assessment 
    // bounded by user_id and cv_version_id directly.
    const { data: assessment, error: assessmentError } = await supabase
      .from('candidate_cv_assessments')
      .select('*')
      .eq('cv_version_id', cvId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (assessmentError || !assessment) {
      return res.status(404).json({ error: 'ASSESSMENT_NOT_FOUND' });
    }

    return res.json(assessment);
  } catch (error: any) {
    console.error('[CV_ASSESSMENT_GET] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

`);

// Replace the POST /:id/assessment route
content = content.replace(/cvParsingRouter\.post\('\/:id\/assessment', async \(req, res\) => \{[\s\S]*?(?=\nEOF|$)/g, 
`cvParsingRouter.post('/:id/assessment', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const cvId = req.params.id; // cv_version_id

    // 1. Verify CV ownership & get latest parse
    const { data: parseRecord, error: parseError } = await supabase
      .from('candidate_cv_parses')
      .select('id, status, extracted_data, reviewed_data, raw_text_hash')
      .eq('cv_version_id', cvId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (parseError || !parseRecord) {
      return res.status(404).json({ error: 'PARSE_NOT_FOUND' });
    }

    if (parseRecord.status !== 'completed' && parseRecord.status !== 'needs_review') {
      return res.status(400).json({ error: 'PARSE_NOT_READY' });
    }

    // 2. Prevent concurrent assessment for the SAME parse
    const { data: existingActive } = await supabase
      .from('candidate_cv_assessments')
      .select('id')
      .eq('parse_id', parseRecord.id)
      .in('status', ['pending', 'processing_rules'])
      .limit(1)
      .single();

    if (existingActive) {
      return res.status(409).json({ error: 'ASSESSMENT_ALREADY_RUNNING' });
    }

    // 3. Create initial assessment record
    const { data: newAssessment, error: insertError } = await supabase
      .from('candidate_cv_assessments')
      .insert({
        user_id: userId,
        cv_version_id: cvId,
        parse_id: parseRecord.id,
        status: 'processing_rules',
        recommendation_status: 'not_started'
      })
      .select()
      .single();

    if (insertError || !newAssessment) {
      console.error('Insert Error:', insertError);
      return res.status(500).json({ error: 'Failed to create assessment record' });
    }

    const hasExtractedData = !!parseRecord.extracted_data;
    const hasRawTextHash = !!parseRecord.raw_text_hash;

    // 4. Run deterministic rules
    let assessmentResult;
    try {
      assessmentResult = calculateAtsReadiness(
        parseRecord.extracted_data,
        parseRecord.reviewed_data,
        { hasExtractedData, hasRawTextHash }
      );
    } catch (error: any) {
      await supabase.from('candidate_cv_assessments').update({
        status: 'failed',
        error_code: 'RULE_ENGINE_FAILED',
        completed_at: new Date().toISOString()
      }).eq('id', newAssessment.id);
      return res.status(500).json({ error: 'RULE_ENGINE_FAILED' });
    }

    // Update DB with rule results and mark deterministic as completed
    await supabase.from('candidate_cv_assessments').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      ruleset_version: assessmentResult.ruleset_version,
      score: assessmentResult.total_score,
      max_score: assessmentResult.max_score,
      component_results: assessmentResult.components,
      recommendation_status: 'processing'
    }).eq('id', newAssessment.id);

    // 5. Run AI recommendations
    const recommendationProvider = new GeminiAtsRecommendationProvider();
    let recommendations = null;
    let recStatus = 'completed';
    let recErrorCode = null;

    try {
      const cvData = parseRecord.reviewed_data || parseRecord.extracted_data || {};
      recommendations = await recommendationProvider.generateRecommendations(assessmentResult, cvData);
    } catch (error: any) {
      console.error('[CV_ASSESSMENT_POST] AI recommendation failed:', error);
      recStatus = 'failed';
      recErrorCode = 'AI_RECOMMENDATIONS_FAILED';
    }

    // 6. Complete assessment AI portion
    const { data: completedAssessment } = await supabase.from('candidate_cv_assessments').update({
      recommendation_status: recStatus,
      recommendations: recommendations,
      ai_provider: 'google',
      ai_model: recommendationProvider.getModelName(),
      recommendation_error_code: recErrorCode
    }).eq('id', newAssessment.id).select().single();

    return res.json(completedAssessment);
  } catch (error: any) {
    console.error('[CV_ASSESSMENT_POST] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
`);

// Clean up any double EOF that might be leftover from the regex replacing till the end
content = content.replace(/\nEOF\n?/g, '');

fs.writeFileSync('server/routes/cvParsing.ts', content);
