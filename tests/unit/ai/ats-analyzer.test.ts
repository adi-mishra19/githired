import { describe, it, expect, beforeEach } from '@jest/globals';

describe('ATS Analyzer', () => {
  describe('Resume Parsing', () => {
    it('should extract text from resume', async () => {
      const mockResumeText = 'John Doe\nSoftware Engineer\nSkills: JavaScript, Python';
      const extracted = await extractResumeText(mockResumeText);
      
      expect(extracted).toContain('John Doe');
      expect(extracted).toContain('JavaScript');
    });

    it('should handle empty resume', async () => {
      const mockResumeText = '';
      const extracted = await extractResumeText(mockResumeText);
      
      expect(extracted).toBe('');
    });

    it('should clean up extra whitespace', async () => {
      const mockResumeText = 'John  Doe\n\n\nSkills:    JavaScript';
      const extracted = await extractResumeText(mockResumeText);
      
      expect(extracted).not.toMatch(/\s{2,}/);
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract technical skills', () => {
      const resumeText = 'Skills: JavaScript, Python, React, Node.js, Docker';
      const skills = extractSkills(resumeText);
      
      expect(skills).toContain('JavaScript');
      expect(skills).toContain('Python');
      expect(skills).toContain('React');
      expect(skills).toContain('Node.js');
      expect(skills).toContain('Docker');
    });

    it('should extract education information', () => {
      const resumeText = 'Bachelor of Technology in Computer Science\nIIT Delhi\nCGPA: 8.5';
      const education = extractEducation(resumeText);
      
      expect(education).toContain('Bachelor');
      expect(education).toContain('Computer Science');
      expect(education).toContain('IIT Delhi');
    });

    it('should extract experience information', () => {
      const resumeText = 'Software Engineer at Google\n2020-2023\nWorked on search algorithms';
      const experience = extractExperience(resumeText);
      
      expect(experience).toContain('Software Engineer');
      expect(experience).toContain('Google');
    });

    it('should handle case-insensitive keyword matching', () => {
      const resumeText = 'SKILLS: JAVASCRIPT, python, ReAcT';
      const skills = extractSkills(resumeText);
      
      expect(skills.map(s => s.toLowerCase())).toContain('javascript');
      expect(skills.map(s => s.toLowerCase())).toContain('python');
      expect(skills.map(s => s.toLowerCase())).toContain('react');
    });
  });

  describe('ATS Scoring', () => {
    it('should calculate match score based on keyword overlap', () => {
      const resumeText = 'Skills: JavaScript, Python, React, Node.js';
      const jobRequirements = 'Required: JavaScript, Python, Docker';
      
      const score = calculateATSScore(resumeText, jobRequirements);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give higher score for more matching keywords', () => {
      const resumeText = 'Skills: JavaScript, Python, React, Node.js, Docker, AWS';
      const jobReq1 = 'Required: JavaScript, Python';
      const jobReq2 = 'Required: JavaScript, Python, React, Node.js, Docker, AWS';
      
      const score1 = calculateATSScore(resumeText, jobReq1);
      const score2 = calculateATSScore(resumeText, jobReq2);
      
      expect(score2).toBeGreaterThanOrEqual(score1);
    });

    it('should give lower score for missing keywords', () => {
      const resumeText = 'Skills: JavaScript, Python';
      const jobRequirements = 'Required: JavaScript, Python, React, Node.js, Docker, Kubernetes';
      
      const score = calculateATSScore(resumeText, jobRequirements);
      
      expect(score).toBeLessThan(50);
    });

    it('should handle perfect match', () => {
      const resumeText = 'Skills: JavaScript, Python, React';
      const jobRequirements = 'Required: JavaScript, Python, React';
      
      const score = calculateATSScore(resumeText, jobRequirements);
      
      expect(score).toBeGreaterThan(90);
    });

    it('should handle no match', () => {
      const resumeText = 'Skills: JavaScript, Python';
      const jobRequirements = 'Required: Java, C++, Ruby';
      
      const score = calculateATSScore(resumeText, jobRequirements);
      
      expect(score).toBeLessThan(20);
    });
  });

  describe('Detailed Scoring Components', () => {
    it('should score skills match', () => {
      const resume = {
        skills: ['JavaScript', 'Python', 'React']
      };
      const job = {
        requiredSkills: ['JavaScript', 'Python', 'Docker']
      };
      
      const skillsScore = calculateSkillsScore(resume.skills, job.requiredSkills);
      
      expect(skillsScore).toBeGreaterThan(0);
      expect(skillsScore).toBeLessThanOrEqual(100);
    });

    it('should score experience match', () => {
      const resume = {
        yearsOfExperience: 3
      };
      const job = {
        requiredExperience: 2
      };
      
      const expScore = calculateExperienceScore(resume.yearsOfExperience, job.requiredExperience);
      
      expect(expScore).toBeGreaterThan(80);
    });

    it('should score education match', () => {
      const resume = {
        education: 'Bachelor of Technology'
      };
      const job = {
        requiredEducation: 'Bachelor degree'
      };
      
      const eduScore = calculateEducationScore(resume.education, job.requiredEducation);
      
      expect(eduScore).toBeGreaterThan(0);
    });

    it('should calculate weighted total score', () => {
      const scores = {
        skills: 80,
        experience: 90,
        education: 70
      };
      const weights = {
        skills: 0.5,
        experience: 0.3,
        education: 0.2
      };
      
      const totalScore = calculateWeightedScore(scores, weights);
      
      expect(totalScore).toBe(scores.skills * weights.skills + 
                               scores.experience * weights.experience + 
                               scores.education * weights.education);
    });
  });

  describe('Resume Recommendations', () => {
    it('should identify missing keywords', () => {
      const resumeText = 'Skills: JavaScript, Python';
      const jobRequirements = 'Required: JavaScript, Python, React, Docker';
      
      const missing = findMissingKeywords(resumeText, jobRequirements);
      
      expect(missing).toContain('React');
      expect(missing).toContain('Docker');
      expect(missing).not.toContain('JavaScript');
    });

    it('should generate improvement suggestions', () => {
      const resumeText = 'Skills: JavaScript';
      const jobRequirements = 'Required: JavaScript, Python, React';
      
      const suggestions = generateSuggestions(resumeText, jobRequirements);
      
      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should prioritize critical missing skills', () => {
      const resumeText = 'Skills: JavaScript';
      const jobRequirements = 'Required: JavaScript, Python (Critical), React (Critical)';
      
      const suggestions = generateSuggestions(resumeText, jobRequirements);
      
      const criticalSuggestions = suggestions.filter(s => s.priority === 'high');
      expect(criticalSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle resume with no skills section', () => {
      const resumeText = 'John Doe\nSoftware Engineer';
      const skills = extractSkills(resumeText);
      
      expect(skills).toBeInstanceOf(Array);
    });

    it('should handle job with no requirements', () => {
      const resumeText = 'Skills: JavaScript, Python';
      const jobRequirements = '';
      
      const score = calculateATSScore(resumeText, jobRequirements);
      
      expect(score).toBeDefined();
    });

    it('should handle special characters in skills', () => {
      const resumeText = 'Skills: C++, C#, Node.js, Vue.js';
      const skills = extractSkills(resumeText);
      
      expect(skills).toContain('C++');
      expect(skills).toContain('C#');
      expect(skills).toContain('Node.js');
    });

    it('should handle very long resume text', () => {
      const longText = 'Skills: ' + Array(1000).fill('JavaScript').join(', ');
      const skills = extractSkills(longText);
      
      expect(skills).toBeDefined();
    });
  });
});

// Helper functions for testing
function extractResumeText(text: string): Promise<string> {
  return Promise.resolve(text.replace(/\s+/g, ' ').trim());
}

function extractSkills(text: string): string[] {
  const skillsMatch = text.match(/Skills?:\s*([^\n]+)/i);
  if (!skillsMatch) return [];
  
  return skillsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
}

function extractEducation(text: string): string {
  const eduMatch = text.match(/(Bachelor|Master|PhD|B\.Tech|M\.Tech).*?(?=\n|$)/gi);
  return eduMatch ? eduMatch.join(' ') : '';
}

function extractExperience(text: string): string {
  const expMatch = text.match(/\b(Engineer|Developer|Manager|Analyst)\b.*?(?=\n\n|$)/gi);
  return expMatch ? expMatch.join(' ') : '';
}

function calculateATSScore(resumeText: string, jobRequirements: string): number {
  const resumeSkills = extractSkills(resumeText).map(s => s.toLowerCase());
  const requiredSkills = extractSkills(jobRequirements).map(s => s.toLowerCase());
  
  if (requiredSkills.length === 0) return 0;
  
  const matchingSkills = resumeSkills.filter(s => requiredSkills.includes(s));
  return Math.round((matchingSkills.length / requiredSkills.length) * 100);
}

function calculateSkillsScore(resumeSkills: string[], requiredSkills: string[]): number {
  const matching = resumeSkills.filter(s => 
    requiredSkills.some(r => r.toLowerCase() === s.toLowerCase())
  );
  return (matching.length / requiredSkills.length) * 100;
}

function calculateExperienceScore(resumeExp: number, requiredExp: number): number {
  if (resumeExp >= requiredExp) return 100;
  return (resumeExp / requiredExp) * 100;
}

function calculateEducationScore(resumeEdu: string, requiredEdu: string): number {
  const eduLevels: Record<string, number> = {
    'high school': 1,
    'bachelor': 2,
    'master': 3,
    'phd': 4
  };
  
  const resumeLevel = Object.entries(eduLevels).find(([key]) => 
    resumeEdu.toLowerCase().includes(key)
  )?.[1] || 0;
  
  const requiredLevel = Object.entries(eduLevels).find(([key]) => 
    requiredEdu.toLowerCase().includes(key)
  )?.[1] || 0;
  
  return resumeLevel >= requiredLevel ? 100 : (resumeLevel / requiredLevel) * 100;
}

function calculateWeightedScore(scores: Record<string, number>, weights: Record<string, number>): number {
  return Object.entries(scores).reduce((total, [key, score]) => {
    return total + (score * (weights[key] || 0));
  }, 0);
}

function findMissingKeywords(resumeText: string, jobRequirements: string): string[] {
  const resumeSkills = extractSkills(resumeText).map(s => s.toLowerCase());
  const requiredSkills = extractSkills(jobRequirements).map(s => s.toLowerCase());
  
  return requiredSkills.filter(s => !resumeSkills.includes(s));
}

function generateSuggestions(resumeText: string, jobRequirements: string): Array<{text: string, priority: string}> {
  const missing = findMissingKeywords(resumeText, jobRequirements);
  
  return missing.map(skill => ({
    text: `Add ${skill} to your skills section`,
    priority: jobRequirements.toLowerCase().includes(`${skill} (critical)`) ? 'high' : 'medium'
  }));
}

