export interface AtsComponentResult {
  id: string;
  score: number;
  max_score: number;
  status: 'pass' | 'fail' | 'warn' | 'not_evaluated';
  reason: string;
}

export interface AtsAssessment {
  total_score: number;
  max_score: number;
  ruleset_version: string;
  components: AtsComponentResult[];
}

export function calculateAtsReadiness(
  extractedData: any,
  reviewedData: any,
  context: {
    hasExtractedData: boolean;
    hasRawTextHash: boolean;
  }
): AtsAssessment {
  const data = reviewedData || extractedData || {};
  const components: AtsComponentResult[] = [];
  let totalScore = 0;
  const maxScore = 100;

  // 1. Machine Readability (10)
  if (context.hasRawTextHash && context.hasExtractedData) {
    components.push({
      id: 'machine_readability',
      score: 10,
      max_score: 10,
      status: 'pass',
      reason: 'CV text was successfully extracted from the document.'
    });
    totalScore += 10;
  } else {
    components.push({
      id: 'machine_readability',
      score: 0,
      max_score: 10,
      status: 'fail',
      reason: 'Insufficient meaningful text could be extracted.'
    });
  }

  // 2. Contact Information (15)
  let contactScore = 0;
  const contactReasons: string[] = [];
  const personal = data.personal || {};

  if (personal.full_name) {
    contactScore += 5;
  } else {
    contactReasons.push('Name is missing.');
  }

  if (personal.phone) {
    contactScore += 5;
  } else {
    contactReasons.push('Phone number is missing.');
  }

  if (personal.location) {
    contactScore += 3;
  } else {
    contactReasons.push('Location is missing.');
  }

  if (personal.links && Array.isArray(personal.links) && personal.links.length > 0) {
    contactScore += 2;
  } else {
    contactReasons.push('Professional links (LinkedIn, GitHub, Portfolio) are missing.');
  }

  components.push({
    id: 'contact_information',
    score: contactScore,
    max_score: 15,
    status: contactScore === 15 ? 'pass' : (contactScore > 5 ? 'warn' : 'fail'),
    reason: contactReasons.length > 0 ? contactReasons.join(' ') : 'Contact information is complete.'
  });
  totalScore += contactScore;

  // 3. Professional Profile (15)
  let profileScore = 0;
  const profileReasons: string[] = [];
  const professional = data.professional || {};

  if (professional.headline) {
    profileScore += 5;
  } else {
    profileReasons.push('Headline/Title is missing.');
  }

  if (professional.summary) {
    if (professional.summary.length > 50) {
      profileScore += 10;
    } else {
      profileScore += 5;
      profileReasons.push('Professional summary is very brief.');
    }
  } else {
    profileReasons.push('Professional summary is missing.');
  }

  components.push({
    id: 'professional_profile',
    score: profileScore,
    max_score: 15,
    status: profileScore === 15 ? 'pass' : (profileScore > 5 ? 'warn' : 'fail'),
    reason: profileReasons.length > 0 ? profileReasons.join(' ') : 'Professional profile is well-structured.'
  });
  totalScore += profileScore;

  // 4. Experience Structure (30)
  let experienceScore = 0;
  const experienceReasons: string[] = [];
  const experience = data.experience || [];

  if (Array.isArray(experience) && experience.length > 0) {
    experienceScore += 10;
    let recentExpScore = 0;
    const expToCheck = experience.slice(0, 2); // Check up to 2 most recent roles

    expToCheck.forEach((exp: any, index: number) => {
      let roleScore = 0;
      if (exp.job_title) roleScore += 2.5;
      else experienceReasons.push(`Role ${index + 1} is missing a job title.`);

      if (exp.company_name || exp.company) roleScore += 2.5;
      else experienceReasons.push(`Role ${index + 1} is missing a company name.`);

      if (exp.start_date) roleScore += 2.5;
      else experienceReasons.push(`Role ${index + 1} is missing a start date.`);

      const desc = exp.description || (Array.isArray(exp.achievements) ? exp.achievements.join(' ') : '');
      if (desc && desc.length > 30) roleScore += 2.5;
      else experienceReasons.push(`Role ${index + 1} description is missing or too brief.`);

      recentExpScore += roleScore;
    });

    experienceScore += recentExpScore;
    if (experience.length === 1) {
      experienceScore += 10; // Prorate if only one role
    }

  } else {
    experienceReasons.push('No work experience entries found.');
  }

  components.push({
    id: 'experience_structure',
    score: experienceScore,
    max_score: 30,
    status: experienceScore === 30 ? 'pass' : (experienceScore > 15 ? 'warn' : 'fail'),
    reason: experienceReasons.length > 0 ? experienceReasons.join(' ') : 'Experience section is well-structured.'
  });
  totalScore += experienceScore;

  // 5. Skills (15)
  let skillsScore = 0;
  const skillsReasons: string[] = [];
  const skills = data.skills || [];

  if (Array.isArray(skills) && skills.length > 0) {
    skillsScore = 15;
  } else {
    skillsReasons.push('No structured skills identified.');
  }

  components.push({
    id: 'skills',
    score: skillsScore,
    max_score: 15,
    status: skillsScore === 15 ? 'pass' : 'fail',
    reason: skillsReasons.length > 0 ? skillsReasons.join(' ') : 'Skills section is present.'
  });
  totalScore += skillsScore;

  // 6. Education (15)
  let eduScore = 0;
  const eduReasons: string[] = [];
  const education = data.education || [];

  if (Array.isArray(education) && education.length > 0) {
    eduScore += 5;
    const firstEdu = education[0];
    if ((firstEdu.institution_name || firstEdu.institution) && (firstEdu.qualification || firstEdu.degree)) {
      eduScore += 10;
    } else {
      eduReasons.push('Institution name or qualification is missing from education entry.');
    }
  } else {
    eduReasons.push('No education entries found.');
  }

  components.push({
    id: 'education',
    score: eduScore,
    max_score: 15,
    status: eduScore === 15 ? 'pass' : (eduScore > 0 ? 'warn' : 'fail'),
    reason: eduReasons.length > 0 ? eduReasons.join(' ') : 'Education section is complete.'
  });
  totalScore += eduScore;

  return {
    total_score: totalScore,
    max_score: maxScore,
    ruleset_version: 'ats-readiness-v1',
    components
  };
}
