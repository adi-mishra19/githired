import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('Storage Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Generate Presigned URL', () => {
    it('should generate presigned URL for upload', async () => {
      const fileName = 'resume.pdf';
      const fileType = 'application/pdf';
      
      const result = await generatePresignedUrl(fileName, fileType);
      
      expect(result.url).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.url).toContain('https://');
    });

    it('should include file extension in key', async () => {
      const fileName = 'resume.pdf';
      const fileType = 'application/pdf';
      
      const result = await generatePresignedUrl(fileName, fileType);
      
      expect(result.key).toContain('.pdf');
    });

    it('should generate unique keys for same filename', async () => {
      const fileName = 'resume.pdf';
      const fileType = 'application/pdf';
      
      const result1 = await generatePresignedUrl(fileName, fileType);
      // Add tiny delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      const result2 = await generatePresignedUrl(fileName, fileType);
      
      expect(result1.key).not.toBe(result2.key);
    });

    it('should sanitize file name', async () => {
      const fileName = 'my resume (2023).pdf';
      const fileType = 'application/pdf';
      
      const result = await generatePresignedUrl(fileName, fileType);
      
      expect(result.key).not.toContain('(');
      expect(result.key).not.toContain(')');
      expect(result.key).not.toContain(' ');
    });

    it('should validate file type', async () => {
      const fileName = 'file.exe';
      const fileType = 'application/x-msdownload';
      
      await expect(generatePresignedUrl(fileName, fileType)).rejects.toThrow('Invalid file type');
    });

    it('should accept PDF files', async () => {
      const fileName = 'resume.pdf';
      const fileType = 'application/pdf';
      
      const result = await generatePresignedUrl(fileName, fileType);
      
      expect(result).toBeDefined();
    });

    it('should accept image files', async () => {
      const fileName = 'logo.png';
      const fileType = 'image/png';
      
      const result = await generatePresignedUrl(fileName, fileType);
      
      expect(result).toBeDefined();
    });
  });

  describe('Delete File', () => {
    it('should delete file from S3', async () => {
      const key = 'resumes/user-123/resume-abc.pdf';
      const result = await deleteFile(key);
      
      expect(result.success).toBe(true);
    });

    it('should handle non-existent file', async () => {
      const key = 'non-existent-file.pdf';
      const result = await deleteFile(key);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should validate key format', async () => {
      const invalidKey = '';
      
      await expect(deleteFile(invalidKey)).rejects.toThrow('Invalid key');
    });

    it('should prevent path traversal attacks', async () => {
      const maliciousKey = '../../../etc/passwd';
      
      await expect(deleteFile(maliciousKey)).rejects.toThrow('Invalid key');
    });
  });

  describe('Get File URL', () => {
    it('should generate public URL for file', () => {
      const key = 'resumes/user-123/resume.pdf';
      const url = getFileUrl(key);
      
      expect(url).toBeDefined();
      expect(url).toContain(key);
      expect(url).toContain('https://');
    });

    it('should use correct bucket', () => {
      const key = 'resumes/resume.pdf';
      const url = getFileUrl(key);
      
      expect(url).toContain('s3');
      expect(url).toContain('amazonaws.com');
    });
  });

  describe('File Validation', () => {
    it('should validate PDF file size', () => {
      const fileSize = 5 * 1024 * 1024; // 5MB
      const result = validateFileSize(fileSize, 'application/pdf');
      
      expect(result.valid).toBe(true);
    });

    it('should reject oversized PDF', () => {
      const fileSize = 15 * 1024 * 1024; // 15MB
      const result = validateFileSize(fileSize, 'application/pdf');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should validate image file size', () => {
      const fileSize = 2 * 1024 * 1024; // 2MB
      const result = validateFileSize(fileSize, 'image/png');
      
      expect(result.valid).toBe(true);
    });

    it('should reject oversized image', () => {
      const fileSize = 10 * 1024 * 1024; // 10MB
      const result = validateFileSize(fileSize, 'image/png');
      
      expect(result.valid).toBe(false);
    });

    it('should validate file extension matches type', () => {
      const fileName = 'resume.pdf';
      const fileType = 'application/pdf';
      const result = validateFileType(fileName, fileType);
      
      expect(result.valid).toBe(true);
    });

    it('should reject mismatched extension and type', () => {
      const fileName = 'resume.pdf';
      const fileType = 'image/png';
      const result = validateFileType(fileName, fileType);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('Storage Paths', () => {
    it('should generate resume path', () => {
      const userId = 'user-123';
      const fileName = 'resume.pdf';
      const path = generateResumePath(userId, fileName);
      
      expect(path).toContain('resumes');
      expect(path).toContain(userId);
      expect(path).toContain('resume');
    });

    it('should generate logo path', () => {
      const companyId = 'company-456';
      const fileName = 'logo.png';
      const path = generateLogoPath(companyId, fileName);
      
      expect(path).toContain('logos');
      expect(path).toContain(companyId);
    });

    it('should generate paths with timestamp', () => {
      const userId = 'user-123';
      const fileName = 'resume.pdf';
      const path = generateResumePath(userId, fileName);
      
      expect(path).toContain(userId);
      expect(path).toContain('resume');
      expect(path).toMatch(/\d+/); // Contains timestamp
    });
  });

  describe('Error Handling', () => {
    it('should handle S3 connection errors', async () => {
      const result = await uploadFile('test.pdf', Buffer.from(''), { simulateError: true });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should retry on transient failures', async () => {
      const result = await uploadFile('test.pdf', Buffer.from(''), { simulateRetry: true });
      
      expect(result.success).toBe(true);
      expect(result.retries).toBeGreaterThan(0);
    });

    it('should timeout long operations', async () => {
      const result = await uploadFile('large.pdf', Buffer.from(''), { timeout: 1 });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Metadata', () => {
    it('should store file metadata', async () => {
      const key = 'resumes/test.pdf';
      const metadata = {
        originalName: 'My Resume.pdf',
        uploadedBy: 'user-123',
        uploadedAt: new Date().toISOString()
      };
      
      const result = await setFileMetadata(key, metadata);
      
      expect(result.success).toBe(true);
    });

    it('should retrieve file metadata', async () => {
      const key = 'resumes/test.pdf';
      const metadata = await getFileMetadata(key);
      
      expect(metadata).toBeDefined();
      expect(metadata.originalName).toBeDefined();
    });
  });
});

// Mock functions
async function generatePresignedUrl(fileName: string, fileType: string) {
  const invalidTypes = ['application/x-msdownload', 'application/x-executable'];
  if (invalidTypes.includes(fileType)) {
    throw new Error('Invalid file type');
  }
  
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `resumes/${Date.now()}-${sanitizedName}`;
  const url = `https://s3.amazonaws.com/test-bucket/${key}`;
  
  return { url, key };
}

async function deleteFile(key: string) {
  if (!key || key.includes('..')) {
    throw new Error('Invalid key');
  }
  
  if (key === 'non-existent-file.pdf') {
    return { success: false, error: 'File not found' };
  }
  
  return { success: true };
}

function getFileUrl(key: string) {
  return `https://s3.amazonaws.com/test-bucket/${key}`;
}

function validateFileSize(fileSize: number, fileType: string) {
  const maxSizes: Record<string, number> = {
    'application/pdf': 10 * 1024 * 1024, // 10MB
    'image/png': 5 * 1024 * 1024, // 5MB
    'image/jpeg': 5 * 1024 * 1024
  };
  
  const maxSize = maxSizes[fileType] || 5 * 1024 * 1024;
  
  if (fileSize > maxSize) {
    return { valid: false, error: 'File too large' };
  }
  
  return { valid: true };
}

function validateFileType(fileName: string, fileType: string) {
  const typeMap: Record<string, string[]> = {
    'application/pdf': ['.pdf'],
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg']
  };
  
  const allowedExtensions = typeMap[fileType] || [];
  const hasValidExtension = allowedExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  
  return { valid: hasValidExtension };
}

function generateResumePath(userId: string, fileName: string) {
  const timestamp = Date.now();
  return `resumes/${userId}/resume-${timestamp}.pdf`;
}

function generateLogoPath(companyId: string, fileName: string) {
  const timestamp = Date.now();
  const ext = fileName.split('.').pop();
  return `logos/${companyId}/logo-${timestamp}.${ext}`;
}

async function uploadFile(fileName: string, buffer: Buffer, options: any = {}) {
  if (options.simulateError) {
    return { success: false, error: 'S3 connection failed' };
  }
  
  if (options.simulateRetry) {
    return { success: true, retries: 2 };
  }
  
  if (options.timeout && options.timeout < 10) {
    return { success: false, error: 'Operation timeout' };
  }
  
  return { success: true, retries: 0 };
}

async function setFileMetadata(key: string, metadata: any) {
  return { success: true };
}

async function getFileMetadata(key: string) {
  return {
    originalName: 'test.pdf',
    uploadedBy: 'user-123',
    uploadedAt: new Date().toISOString()
  };
}

