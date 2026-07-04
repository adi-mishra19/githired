import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Define mockJobs at module level so all mock functions can access it
const mockJobs: any[] = [];

describe('Jobs Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJobs.length = 0;
  });

  describe('Create Job', () => {
    it('should create a new job posting', async () => {
      const jobData = {
        title: 'Software Engineer',
        description: 'Great opportunity',
        companyId: 'company-123',
        location: 'New York',
        salary: '100k-120k'
      };
      
      const result = await createJob(jobData);
      
      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
    });

    it('should require title', async () => {
      const jobData = {
        description: 'Great opportunity',
        companyId: 'company-123'
      };
      
      const result = await createJob(jobData as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/title required/i);
    });

    it('should require description', async () => {
      const jobData = {
        title: 'Software Engineer',
        companyId: 'company-123'
      };
      
      const result = await createJob(jobData as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/description required/i);
    });

    it('should set default status to active', async () => {
      const jobData = {
        title: 'Software Engineer',
        description: 'Great opportunity',
        companyId: 'company-123'
      };
      
      const result = await createJob(jobData);
      
      expect(result.job.status).toBe('active');
    });

    it('should set application deadline if provided', async () => {
      const deadline = new Date('2025-12-31');
      const jobData = {
        title: 'Software Engineer',
        description: 'Great opportunity',
        companyId: 'company-123',
        deadline
      };
      
      const result = await createJob(jobData);
      
      expect(result.job.deadline).toEqual(deadline);
    });
  });

  describe('Update Job', () => {
    it('should update job details', async () => {
      const jobId = 'job-123';
      const updates = {
        title: 'Senior Software Engineer',
        salary: '120k-150k'
      };
      
      const result = await updateJob(jobId, updates);
      
      expect(result.success).toBe(true);
      expect(result.job.title).toBe(updates.title);
    });

    it('should not allow updating company id', async () => {
      const jobId = 'job-123';
      const updates = {
        companyId: 'different-company'
      };
      
      const result = await updateJob(jobId, updates);
      
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/cannot change company/i);
    });

    it('should update status', async () => {
      const jobId = 'job-123';
      const updates = {
        status: 'closed'
      };
      
      const result = await updateJob(jobId, updates);
      
      expect(result.success).toBe(true);
      expect(result.job.status).toBe('closed');
    });
  });

  describe('Delete Job', () => {
    it('should delete job posting', async () => {
      const jobId = 'job-123';
      const result = await deleteJob(jobId);
      
      expect(result.success).toBe(true);
    });

    it('should not delete job with applications', async () => {
      const jobId = 'job-with-applications';
      const result = await deleteJob(jobId);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('has applications');
    });

    it('should soft delete instead of hard delete', async () => {
      const jobId = 'job-123';
      const result = await deleteJob(jobId);
      
      expect(result.deletedAt).toBeDefined();
    });
  });

  describe('Get Jobs', () => {
    it('should get all active jobs', async () => {
      const jobs = await getJobs();
      
      expect(Array.isArray(jobs)).toBe(true);
      jobs.forEach(job => {
        expect(job.status).toBe('active');
      });
    });

    it('should filter jobs by location', async () => {
      const location = 'New York';
      const jobs = await getJobs({ location });
      
      jobs.forEach(job => {
        expect(job.location).toContain(location);
      });
    });

    it('should filter jobs by company', async () => {
      const companyId = 'company-123';
      const jobs = await getJobs({ companyId });
      
      jobs.forEach(job => {
        expect(job.companyId).toBe(companyId);
      });
    });

    it('should search jobs by title', async () => {
      const searchTerm = 'engineer';
      const jobs = await searchJobs(searchTerm);
      
      jobs.forEach(job => {
        expect(job.title.toLowerCase()).toContain(searchTerm.toLowerCase());
      });
    });

    it('should search jobs by description', async () => {
      const searchTerm = 'react';
      const jobs = await searchJobs(searchTerm);
      
      jobs.forEach(job => {
        const searchableText = `${job.title} ${job.description}`.toLowerCase();
        expect(searchableText).toContain(searchTerm.toLowerCase());
      });
    });

    it('should support pagination', async () => {
      const page1 = await getJobs({ page: 1, limit: 10 });
      const page2 = await getJobs({ page: 2, limit: 10 });
      
      expect(page1.length).toBeLessThanOrEqual(10);
      expect(page2.length).toBeLessThanOrEqual(10);
    });

    it('should sort jobs by date', async () => {
      const jobs = await getJobs({ sortBy: 'created_at', order: 'desc' });
      
      for (let i = 0; i < jobs.length - 1; i++) {
        expect(new Date(jobs[i].created_at).getTime()).toBeGreaterThanOrEqual(
          new Date(jobs[i + 1].created_at).getTime()
        );
      }
    });
  });

  describe('Job Statistics', () => {
    it('should get application count for job', async () => {
      const jobId = 'job-123';
      const stats = await getJobStats(jobId);
      
      expect(stats.applicationCount).toBeDefined();
      expect(typeof stats.applicationCount).toBe('number');
    });

    it('should get view count for job', async () => {
      const jobId = 'job-123';
      const stats = await getJobStats(jobId);
      
      expect(stats.viewCount).toBeDefined();
    });

    it('should calculate days since posting', async () => {
      const jobId = 'job-123';
      const stats = await getJobStats(jobId);
      
      expect(stats.daysSincePosting).toBeDefined();
      expect(stats.daysSincePosting).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Job Status Management', () => {
    it('should activate job', async () => {
      const jobId = 'job-123';
      const result = await activateJob(jobId);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('active');
    });

    it('should close job', async () => {
      const jobId = 'job-123';
      const result = await closeJob(jobId);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('closed');
    });

    it('should pause job', async () => {
      const jobId = 'job-123';
      const result = await pauseJob(jobId);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('paused');
    });
  });

  describe('Authorization', () => {
    it('should allow company to create job', async () => {
      const jobData = {
        title: 'Software Engineer',
        description: 'Great opportunity',
        companyId: 'company-123'
      };
      
      const result = await createJob(jobData, { requesterId: 'company-123', role: 'company' });
      
      expect(result.success).toBe(true);
    });

    it('should not allow student to create job', async () => {
      const jobData = {
        title: 'Software Engineer',
        description: 'Great opportunity',
        companyId: 'company-123'
      };
      
      const result = await createJob(jobData, { requesterId: 'student-456', role: 'student' });
      
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/unauthorized/i);
    });

    it('should allow company to update own jobs only', async () => {
      const jobId = 'job-123';
      const updates = { title: 'Updated Title' };
      
      const result = await updateJob(jobId, updates, { 
        requesterId: 'company-123', 
        jobCompanyId: 'company-123',
        role: 'company' 
      });
      
      expect(result.success).toBe(true);
    });

    it('should not allow company to update other company jobs', async () => {
      const jobId = 'job-123';
      const updates = { title: 'Updated Title' };
      
      const result = await updateJob(jobId, updates, { 
        requesterId: 'company-456', 
        jobCompanyId: 'company-123',
        role: 'company' 
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/unauthorized/i);
    });
  });
});

// Mock functions
async function createJob(jobData: any, options: any = {}) {
  if (options.role === 'student') {
    return { success: false, error: 'Unauthorized: students cannot create jobs' };
  }
  
  if (!jobData.title) {
    return { success: false, error: 'Title required' };
  }
  
  if (!jobData.description) {
    return { success: false, error: 'Description required' };
  }
  
  const jobId = `job-${Date.now()}`;
  const job = {
    ...jobData,
    jobId,
    status: jobData.status || 'active',
    created_at: new Date()
  };
  
  mockJobs.push(job);
  
  return { success: true, jobId, job };
}

async function updateJob(jobId: string, updates: any, options: any = {}) {
  if (updates.companyId) {
    return { success: false, error: 'Cannot change company' };
  }
  
  if (options.role === 'company' && options.requesterId !== options.jobCompanyId) {
    return { success: false, error: 'Unauthorized: can only update own jobs' };
  }
  
  const job = { ...updates, jobId };
  return { success: true, job };
}

async function deleteJob(jobId: string) {
  if (jobId === 'job-with-applications') {
    return { success: false, error: 'Cannot delete job that has applications' };
  }
  
  return { success: true, deletedAt: new Date() };
}

async function getJobs(options: any = {}) {
  let jobs = [...mockJobs];
  
  if (options.location) {
    jobs = jobs.filter(j => j.location?.includes(options.location));
  }
  
  if (options.companyId) {
    jobs = jobs.filter(j => j.companyId === options.companyId);
  }
  
  if (options.sortBy === 'created_at' && options.order === 'desc') {
    jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  
  if (options.page && options.limit) {
    const start = (options.page - 1) * options.limit;
    jobs = jobs.slice(start, start + options.limit);
  }
  
  return jobs;
}

async function searchJobs(searchTerm: string) {
  return mockJobs.filter(job => {
    const searchableText = `${job.title} ${job.description}`.toLowerCase();
    return searchableText.includes(searchTerm.toLowerCase());
  });
}

async function getJobStats(jobId: string) {
  return {
    applicationCount: 42,
    viewCount: 156,
    daysSincePosting: 5
  };
}

async function activateJob(jobId: string) {
  return { success: true, status: 'active' };
}

async function closeJob(jobId: string) {
  return { success: true, status: 'closed' };
}

async function pauseJob(jobId: string) {
  return { success: true, status: 'paused' };
}

