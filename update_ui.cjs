const fs = require('fs');
let content = fs.readFileSync('src/features/candidate/CandidateCVAssessment.tsx', 'utf-8');

// Update Assessment interface
content = content.replace(/interface Assessment \{[\s\S]*?created_at: string;\n\}/, 
`interface Assessment {
  id: string;
  status: string;
  recommendation_status: string;
  score: number | null;
  max_score: number | null;
  component_results: ComponentResult[] | null;
  recommendations: {
    strengths: string[];
    issues: string[];
    recommendations: string[];
  } | null;
  error_code: string | null;
  recommendation_error_code: string | null;
  created_at: string;
}`);

// Replace rendering logic to handle split status
content = content.replace(/\{assessment\.status !== 'completed' && assessment\.status !== 'failed' && \([\s\S]*?\)\}/,
`{assessment.status !== 'completed' && assessment.status !== 'failed' && (
            <div className="text-sm text-neutral-600 dark:text-neutral-400 animate-pulse bg-neutral-50 dark:bg-neutral-800 p-3 rounded">
              Assessment rules are currently processing...
            </div>
          )}`);

content = content.replace(/\{assessment\.recommendations && \([\s\S]*?\}\)/,
`{assessment.recommendation_status === 'processing' && (
            <div className="text-sm text-neutral-600 dark:text-neutral-400 animate-pulse bg-neutral-50 dark:bg-neutral-800 p-3 rounded">
              Generating AI recommendations...
            </div>
          )}

          {assessment.recommendation_status === 'failed' && (
            <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 p-3 rounded border border-amber-200 dark:border-amber-700/30">
              AI recommendations failed: {assessment.recommendation_error_code}
            </div>
          )}

          {assessment.recommendations && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-green-700 dark:text-green-400 mb-2">Strengths</h4>
                <ul className="list-disc pl-5 text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
                  {assessment.recommendations.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              
              {assessment.recommendations.issues && assessment.recommendations.issues.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-amber-700 dark:text-amber-400 mb-2">Issues Detected</h4>
                  <ul className="list-disc pl-5 text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
                    {assessment.recommendations.issues.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="font-medium text-sm text-blue-700 dark:text-blue-400 mb-2">Recommended Improvements</h4>
                <ul className="list-disc pl-5 text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
                  {assessment.recommendations.recommendations.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
          )}`);

fs.writeFileSync('src/features/candidate/CandidateCVAssessment.tsx', content);
