import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { templatesApi, documentsApi } from '../services/api';
import FormRenderer from '../components/FormRenderer/FormRenderer';
import './FillForm.css';

function FillForm() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [documentName, setDocumentName] = useState('');

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      const data = await templatesApi.getById(templateId);
      setTemplate(data.template);
      
      // Set default document name
      const date = new Date().toISOString().split('T')[0];
      setDocumentName(`${data.template.name} - ${date}`);
    } catch (error) {
      alert('Failed to load template: ' + error.message);
      navigate('/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (userData) => {
    try {
      setGenerating(true);

      const result = await documentsApi.generate({
        templateId,
        name: documentName,
        userData,
      });

      alert('Document generated successfully!');
      
      // Download the document
      window.open(result.document.downloadUrl, '_blank');
      
      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (error) {
      alert('Failed to generate document: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading template...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="loading-screen">
        <p>Template not found</p>
      </div>
    );
  }

  return (
    <div className="fill-form-page">
      <header className="app-header">
        <div className="container app-header-content">
          <div className="app-logo">Document Template Generator</div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">{template.name}</h1>
            <p className="page-description">
              Fill out the form below to generate your document
            </p>
          </div>

          <div className="form-container">
            <div className="form-header card">
              <div className="form-group">
                <label className="form-label">Document Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  required
                />
              </div>
            </div>

            <FormRenderer
              schema={template.schema_json}
              onSubmit={handleSubmit}
              loading={generating}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default FillForm;

