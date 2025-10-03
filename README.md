# Document Template Generator

A web application that analyzes user-uploaded Word documents to automatically generate custom form interfaces and document templates. The system learns document structure and content patterns from 3 example documents, creates a data entry form, and outputs editable Word documents.

## Features

- **Smart Document Analysis**: Upload 3 similar documents and let AI analyze their structure
- **Automatic Form Generation**: Creates custom forms based on identified fields and patterns
- **Template Management**: Save and reuse templates for recurring document types
- **Document Generation**: Fill out forms and generate professional Word documents
- **User-Friendly Interface**: Clean, modern UI with intuitive workflows

## Tech Stack

### Backend
- Node.js with Express
- PostgreSQL (via Supabase)
- Anthropic Claude API (Sonnet 4.5 for analysis, Haiku for form assistance)
- mammoth.js for Word document parsing
- docx for document generation
- Supabase for auth, database, and storage

### Frontend
- React 18
- React Router for navigation
- React Hook Form for form management
- Vanilla CSS (no framework dependencies)
- Vite for build tooling

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account
- Anthropic API key

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Fill in your environment variables:
```env
NODE_ENV=development
PORT=5000

SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

SUPABASE_STORAGE_BUCKET=user-documents

ANTHROPIC_API_KEY=your-anthropic-api-key
```

5. Set up Supabase:
   - Create a new Supabase project
   - Run the migration script in `database/migrations/001_initial_schema.sql`
   - Create a storage bucket named `user-documents` with appropriate policies

6. Start the development server:
```bash
npm run dev
```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Fill in your environment variables:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:5000
```

5. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Usage

### Creating a Template

1. **Sign Up/Login**: Create an account or log in to your existing account

2. **Upload Documents**: 
   - Click "Create New Template"
   - Upload 3 similar Word documents (.docx format)
   - Documents should be of the same type (e.g., all SWMS, all contracts, etc.)

3. **AI Analysis**:
   - The system analyzes your documents using Claude Sonnet 4.5
   - Identifies common structure, variable fields, and boilerplate content
   - Takes approximately 1-2 minutes

4. **Review & Save**:
   - Review the analysis results
   - Check the confidence score and identified fields
   - Give your template a name and description
   - Save the template

### Generating Documents

1. **Select Template**: Choose a template from your dashboard or templates page

2. **Fill Out Form**: Complete the auto-generated form with your specific data
   - Required fields are marked with *
   - Help text provides guidance for complex fields
   - Tables can have rows added/removed dynamically

3. **Generate**: Click "Generate Document" to create your Word document

4. **Download**: Your document will be automatically downloaded

## Project Structure

```
project-root/
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── utils/        # Helper functions
│   └── package.json
│
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── services/     # API services
│   └── package.json
│
├── database/             # Database migrations
│   └── migrations/
│
└── README.md
```

## API Endpoints

### Upload Sessions
- `POST /api/upload-session/create` - Create new upload session
- `POST /api/upload-session/:id/upload` - Upload a document
- `POST /api/upload-session/:id/analyze` - Start analysis
- `GET /api/upload-session/:id/status` - Check analysis status

### Templates
- `GET /api/templates` - List user's templates
- `GET /api/templates/:id` - Get template details
- `POST /api/templates` - Create template from session
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

### Documents
- `POST /api/documents/generate` - Generate document
- `GET /api/documents` - List generated documents
- `GET /api/documents/:id/download` - Download document
- `DELETE /api/documents/:id` - Delete document

## Security

- Row Level Security (RLS) enabled on all Supabase tables
- JWT-based authentication via Supabase Auth
- Rate limiting on API endpoints
- File type and size validation
- CORS protection

## Cost Estimation

### Per Template Creation:
- Sonnet 4.5 Analysis: ~$1.20
- Storage: negligible
- **Total: ~$1.30 per template**

### Per Document Generation:
- Server compute: negligible
- Optional AI assistance: ~$0.05
- **Total: ~$0.05 per document**

## Future Enhancements

- PDF upload support
- Template marketplace
- Team collaboration features
- Advanced AI form assistance
- Multi-language support
- OCR for scanned documents
- Integration with DocuSign and other tools

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues, questions, or contributions, please open an issue on GitHub.
