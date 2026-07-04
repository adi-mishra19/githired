import { describe, it, expect } from '@jest/globals';

describe('Profile Analyzer', () => {
  describe('Profile Completeness Calculation', () => {
    it('should calculate 100% for complete profile', () => {
      const profile = {
        name: 'John Doe',
        email: 'john@example.com',
        college: 'IIT Delhi',
        cgpa: 8.5,
        degree: 'B.Tech',
        graduationYear: 2024,
        skills: ['JavaScript', 'Python'],
        resumeUrl: 'https://example.com/resume.pdf',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        githubUrl: 'https://github.com/johndoe'
      };
      
      const completeness = calculateCompleteness(profile);
      expect(completeness).toBe(100);
    });

    it('should calculate 0% for empty profile', () => {
      const profile = {};
      
      const completeness = calculateCompleteness(profile);
      expect(completeness).toBe(0);
    });

    it('should calculate partial completeness', () => {
      const profile = {
        name: 'John Doe',
        email: 'john@example.com',
        college: 'IIT Delhi'
      };
      
      const completeness = calculateCompleteness(profile);
      expect(completeness).toBeGreaterThan(0);
      expect(completeness).toBeLessThan(100);
    });

    it('should weight important fields higher', () => {
      const profileWithResume = {
        name: 'John',
        email: 'john@example.com',
        resumeUrl: 'https://example.com/resume.pdf'
      };
      
      const profileWithGithub = {
        name: 'Jane',
        email: 'jane@example.com',
        githubUrl: 'https://github.com/jane'
      };
      
      const score1 = calculateCompleteness(profileWithResume);
      const score2 = calculateCompleteness(profileWithGithub);
      
      // Resume should be weighted more than GitHub
      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('Gap Detection', () => {
    it('should identify missing required fields', () => {
      const profile = {
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      const gaps = identifyGaps(profile);
      
      expect(gaps).toContain('college');
      expect(gaps).toContain('cgpa');
      expect(gaps).toContain('degree');
    });

    it('should not report gaps for complete profile', () => {
      const profile = {
        name: 'John Doe',
        email: 'john@example.com',
        college: 'IIT Delhi',
        cgpa: 8.5,
        degree: 'B.Tech',
        graduationYear: 2024,
        skills: ['JavaScript'],
        resumeUrl: 'https://example.com/resume.pdf'
      };
      
      const gaps = identifyGaps(profile);
      
      expect(gaps.length).toBe(0);
    });

    it('should identify missing optional but recommended fields', () => {
      const profile = {
        name: 'John Doe',
        email: 'john@example.com',
        college: 'IIT Delhi',
        cgpa: 8.5,
        degree: 'B.Tech',
        graduationYear: 2024
      };
      
      const gaps = identifyGaps(profile, { includeOptional: true });
      
      expect(gaps).toContain('resumeUrl');
      expect(gaps).toContain('skills');
    });

    it('should categorize gaps by severity', () => {
      const profile = {
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      const categorizedGaps = categorizeGaps(profile);
      
      expect(categorizedGaps.critical).toBeDefined();
      expect(categorizedGaps.important).toBeDefined();
      expect(categorizedGaps.optional).toBeDefined();
    });
  });

  describe('Improvement Suggestions', () => {
    it('should generate suggestions for incomplete profile', () => {
      const profile = {
        name: 'John Doe',
        email: 'john@example.com',
        college: 'IIT Delhi'
      };
      
      const suggestions = generateSuggestions(profile);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('field');
      expect(suggestions[0]).toHaveProperty('message');
      expect(suggestions[0]).toHaveProperty('priority');
    });

    it('should prioritize critical fields', () => {
      const profile = {
        name: 'John Doe'
      };
      
      const suggestions = generateSuggestions(profile);
      const criticalSuggestions = suggestions.filter(s => s.priority === 'critical');
      
      expect(criticalSuggestions.length).toBeGreaterThan(0);
    });

    it('should suggest adding resume if missing', () => {
      const profile = {
        name: 'John Doe',
        email: 'john@example.com',
        college: 'IIT Delhi',
        cgpa: 8.5
      };
      
      const suggestions = generateSuggestions(profile);
      const resumeSuggestion = suggestions.find(s => s.field === 'resumeUrl');
      
      expect(resumeSuggestion).toBeDefined();
    });

    it('should suggest improving weak fields', () => {
      const profile = {
        name: 'John',
        email: 'john@example.com',
        skills: [] // Empty skills array
      };
      
      const suggestions = generateSuggestions(profile);
      const skillsSuggestion = suggestions.find(s => s.field === 'skills');
      
      expect(skillsSuggestion).toBeDefined();
      expect(skillsSuggestion?.message).toMatch(/add/i);
    });
  });

  describe('Profile Strength Analysis', () => {
    it('should rate strong profile as excellent', () => {
      const profile = {
        name: 'John Doe',
        email: 'john@example.com',
        college: 'IIT Delhi',
        cgpa: 9.5,
        degree: 'B.Tech',
        graduationYear: 2024,
        skills: ['JavaScript', 'Python', 'React', 'Node.js', 'Docker'],
        resumeUrl: 'https://example.com/resume.pdf',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        githubUrl: 'https://github.com/johndoe',
        projects: ['Project 1', 'Project 2']
      };
      
      const strength = analyzeProfileStrength(profile);
      
      expect(strength.rating).toBe('excellent');
      expect(strength.score).toBeGreaterThan(90);
    });

    it('should rate weak profile as needs improvement', () => {
      const profile = {
        name: 'John',
        email: 'john@example.com'
      };
      
      const strength = analyzeProfileStrength(profile);
      
      expect(strength.rating).toBe('needs improvement');
      expect(strength.score).toBeLessThan(40);
    });

    it('should provide detailed breakdown by category', () => {
      const profile = {
        name: 'John Doe',
        email: 'john@example.com',
        college: 'IIT Delhi',
        cgpa: 8.5,
        skills: ['JavaScript', 'Python']
      };
      
      const strength = analyzeProfileStrength(profile);
      
      expect(strength.breakdown).toBeDefined();
      expect(strength.breakdown.education).toBeDefined();
      expect(strength.breakdown.skills).toBeDefined();
      expect(strength.breakdown.experience).toBeDefined();
    });
  });

  describe('Competitive Analysis', () => {
    it('should compare profile to peer average', () => {
      const profile = {
        cgpa: 8.5,
        skills: ['JavaScript', 'Python', 'React']
      };
      
      const peerAverage = {
        cgpa: 7.5,
        skillCount: 2
      };
      
      const comparison = compareTopeers(profile, peerAverage);
      
      expect(comparison.cgpaComparison).toBe('above average');
      expect(comparison.skillsComparison).toBe('above average');
    });

    it('should identify areas where profile is below average', () => {
      const profile = {
        cgpa: 6.5,
        skills: ['JavaScript']
      };
      
      const peerAverage = {
        cgpa: 8.0,
        skillCount: 4
      };
      
      const comparison = compareTopeers(profile, peerAverage);
      
      expect(comparison.cgpaComparison).toBe('below average');
      expect(comparison.skillsComparison).toBe('below average');
    });

    it('should calculate percentile ranking', () => {
      const profile = {
        cgpa: 8.5,
        skillCount: 5
      };
      
      const allProfiles = [
        { cgpa: 7.0, skillCount: 2 },
        { cgpa: 7.5, skillCount: 3 },
        { cgpa: 8.0, skillCount: 4 },
        { cgpa: 8.5, skillCount: 5 },
        { cgpa: 9.0, skillCount: 6 }
      ];
      
      const percentile = calculatePercentile(profile, allProfiles);
      
      expect(percentile).toBeGreaterThan(0);
      expect(percentile).toBeLessThanOrEqual(100);
    });
  });

  describe('Skill Analysis', () => {
    it('should identify trending skills', () => {
      const profile = {
        skills: ['JavaScript', 'Python', 'React']
      };
      
      const trendingSkills = ['Python', 'AI', 'Machine Learning'];
      
      const analysis = analyzeSkills(profile.skills, trendingSkills);
      
      expect(analysis.hasTrendingSkills).toBe(true);
      expect(analysis.trendingCount).toBe(1);
    });

    it('should suggest adding in-demand skills', () => {
      const profile = {
        skills: ['JavaScript']
      };
      
      const inDemandSkills = ['Python', 'React', 'Docker'];
      
      const suggestions = suggestSkills(profile.skills, inDemandSkills);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('Python');
    });

    it('should categorize skills by type', () => {
      const skills = ['JavaScript', 'Python', 'AWS', 'Git', 'Agile'];
      
      const categorized = categorizeSkills(skills);
      
      expect(categorized.languages).toContain('JavaScript');
      expect(categorized.languages).toContain('Python');
      expect(categorized.cloud).toContain('AWS');
      expect(categorized.tools).toContain('Git');
      expect(categorized.methodologies).toContain('Agile');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null profile', () => {
      const profile = null;
      
      const completeness = calculateCompleteness(profile as any);
      
      expect(completeness).toBe(0);
    });

    it('should handle profile with invalid data types', () => {
      const profile = {
        cgpa: 'invalid' as any,
        skills: 'not an array' as any
      };
      
      const completeness = calculateCompleteness(profile);
      
      expect(completeness).toBeDefined();
      expect(completeness).toBeGreaterThanOrEqual(0);
    });

    it('should handle very high CGPA values', () => {
      const profile = {
        cgpa: 10.0
      };
      
      const strength = analyzeProfileStrength(profile);
      
      expect(strength.breakdown.education).toBeLessThanOrEqual(100);
    });
  });
});

// Helper functions
function calculateCompleteness(profile: any): number {
  if (!profile) return 0;
  
  const fields = [
    { key: 'name', weight: 1 },
    { key: 'email', weight: 1 },
    { key: 'college', weight: 2 },
    { key: 'cgpa', weight: 2 },
    { key: 'degree', weight: 2 },
    { key: 'graduationYear', weight: 1 },
    { key: 'skills', weight: 3 },
    { key: 'resumeUrl', weight: 5 },
    { key: 'linkedinUrl', weight: 1 },
    { key: 'githubUrl', weight: 1 }
  ];
  
  const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
  let earnedWeight = 0;
  
  fields.forEach(field => {
    if (profile[field.key]) {
      if (Array.isArray(profile[field.key])) {
        if (profile[field.key].length > 0) earnedWeight += field.weight;
      } else {
        earnedWeight += field.weight;
      }
    }
  });
  
  return Math.round((earnedWeight / totalWeight) * 100);
}

function identifyGaps(profile: any, options = { includeOptional: false }): string[] {
  const requiredFields = ['name', 'email', 'college', 'cgpa', 'degree', 'graduationYear'];
  const optionalFields = ['skills', 'resumeUrl', 'linkedinUrl', 'githubUrl'];
  
  const fieldsToCheck = options.includeOptional 
    ? [...requiredFields, ...optionalFields]
    : requiredFields;
  
  return fieldsToCheck.filter(field => !profile[field] || 
    (Array.isArray(profile[field]) && profile[field].length === 0));
}

function categorizeGaps(profile: any) {
  return {
    critical: ['email', 'name'].filter(f => !profile[f]),
    important: ['college', 'cgpa', 'degree', 'resumeUrl'].filter(f => !profile[f]),
    optional: ['linkedinUrl', 'githubUrl', 'skills'].filter(f => !profile[f])
  };
}

function generateSuggestions(profile: any): Array<{field: string, message: string, priority: string}> {
  const gaps = categorizeGaps(profile);
  const suggestions = [];
  
  gaps.critical.forEach(field => {
    suggestions.push({
      field,
      message: `Add your ${field}`,
      priority: 'critical'
    });
  });
  
  gaps.important.forEach(field => {
    suggestions.push({
      field,
      message: `Complete your ${field} information`,
      priority: 'important'
    });
  });
  
  if (profile.skills && profile.skills.length === 0) {
    suggestions.push({
      field: 'skills',
      message: 'Add your technical skills',
      priority: 'important'
    });
  }
  
  return suggestions;
}

function analyzeProfileStrength(profile: any) {
  const completeness = calculateCompleteness(profile);
  
  let rating = 'needs improvement';
  if (completeness >= 90) rating = 'excellent';
  else if (completeness >= 70) rating = 'good';
  else if (completeness >= 50) rating = 'fair';
  
  return {
    score: completeness,
    rating,
    breakdown: {
      education: profile.cgpa ? Math.min((profile.cgpa / 10) * 100, 100) : 0,
      skills: Array.isArray(profile.skills) ? Math.min(profile.skills.length * 20, 100) : 0,
      experience: profile.resumeUrl ? 100 : 0
    }
  };
}

function compareTopeers(profile: any, peerAverage: any) {
  return {
    cgpaComparison: profile.cgpa > peerAverage.cgpa ? 'above average' : 
                    profile.cgpa < peerAverage.cgpa ? 'below average' : 'average',
    skillsComparison: (profile.skills?.length || 0) > peerAverage.skillCount ? 'above average' :
                     (profile.skills?.length || 0) < peerAverage.skillCount ? 'below average' : 'average'
  };
}

function calculatePercentile(profile: any, allProfiles: any[]): number {
  const score = calculateCompleteness(profile);
  const lowerCount = allProfiles.filter(p => calculateCompleteness(p) < score).length;
  return Math.round((lowerCount / allProfiles.length) * 100);
}

function analyzeSkills(profileSkills: string[], trendingSkills: string[]) {
  const commonSkills = profileSkills.filter(s => 
    trendingSkills.some(t => t.toLowerCase() === s.toLowerCase())
  );
  
  return {
    hasTrendingSkills: commonSkills.length > 0,
    trendingCount: commonSkills.length
  };
}

function suggestSkills(profileSkills: string[], inDemandSkills: string[]): string[] {
  return inDemandSkills.filter(s => 
    !profileSkills.some(p => p.toLowerCase() === s.toLowerCase())
  );
}

function categorizeSkills(skills: string[]) {
  const languages = ['JavaScript', 'Python', 'Java', 'C++', 'Go', 'Rust'];
  const cloud = ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes'];
  const tools = ['Git', 'Jenkins', 'CI/CD'];
  const methodologies = ['Agile', 'Scrum', 'TDD'];
  
  return {
    languages: skills.filter(s => languages.includes(s)),
    cloud: skills.filter(s => cloud.includes(s)),
    tools: skills.filter(s => tools.includes(s)),
    methodologies: skills.filter(s => methodologies.includes(s))
  };
}

