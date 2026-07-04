# NLP-SQL Engine Training Dataset

## Overview
This dataset contains training examples for fine-tuning Mistral-7B on natural language to SQL conversion for the GitHired placement management system.

## Dataset Structure

### Training Files
- **train.json**: 20 training examples with natural language queries and corresponding SQL
- **train_tables.json**: Database schema information for training
- **dev.json**: 5 validation examples
- **dev_tables.json**: Database schema for validation
- **dev_tied_append.json**: Additional validation examples

### Database Schema
The model was trained on the following placement database schema:

**Tables:**
- `users`: User authentication and roles
- `students`: Student profiles and academic information
- `companies`: Company profiles and contact information
- `jobs`: Job postings and requirements
- `applications`: Student job applications and status

**Key Relationships:**
- Students apply to jobs through applications
- Jobs belong to companies
- Applications track the status of each student's application

## Training Process

### Model Configuration
- **Base Model**: Mistral-7B (4-bit quantization)
- **Fine-tuning Method**: LoRA (Low-Rank Adaptation)
- **Training Steps**: 25 steps
- **Learning Rate**: 1e-4
- **Batch Size**: 2 (with gradient accumulation)

### Training Examples
The model learned to convert queries like:
- "Show me all companies that visited in September" → `SELECT DISTINCT c.company_name FROM companies c JOIN jobs j ON c.id = j.company_id WHERE MONTH(j.created_at) = 9`
- "How many students applied to Microsoft?" → `SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id = j.id JOIN companies c ON j.company_id = c.id WHERE c.company_name = 'Microsoft'`

## Domain-Specific Learning
The model was specifically trained on placement-related terminology and database relationships, enabling it to:
- Understand placement-specific queries
- Generate accurate SQL for complex joins
- Handle domain-specific terms (CGPA, LPA, placement, etc.)
- Work with the specific schema structure

## Usage
The trained model can be loaded and used for natural language to SQL conversion without requiring the database schema at inference time, as it has learned the schema relationships during training.
