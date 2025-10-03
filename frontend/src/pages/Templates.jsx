import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { templatesApi } from '../services/api';
import './Templates.css';

function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ documentType: '', industry: '' });

  useEffect(() => {
    loadTemplates();
  }, [filter]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await templatesApi.getAll(filter);
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await templatesApi.delete(templateId);
      setTemplates(templates.filter((t) => t.id !== templateId));
    } catch (error) {
      alert('Failed to delete template: ' + error.message);
    }
  };

  return (
    <div className="templates-page">
      <header className="app-header">
        <div className="container app-header-content">
          <Link to="/dashboard" className="app-logo">
            Document Template Generator
          </Link>
          <nav className="app-nav">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/templates" className="active">Templates</Link>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <div className="page-header">
            <div>
              <h1 className="page-title">Templates</h1>
              <p className="page-description">Manage your document templates</p>
            </div>
            <Link to="/templates/create" className="btn btn-primary">
              + Create New Template
            </Link>
          </div>

          {loading ? (
            <div className="loading-screen">
              <div className="spinner"></div>
              <p>Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="empty-state card">
              <p>No templates found. Create your first template to get started.</p>
              <Link to="/templates/create" className="btn btn-primary">
                Create Template
              </Link>
            </div>
          ) : (
            <div className="templates-list">
              {templates.map((template) => (
                <div key={template.id} className="template-item card">
                  <div className="template-item-header">
                    <div>
                      <h3 className="template-item-name">{template.name}</h3>
                      {template.description && (
                        <p className="template-item-description">{template.description}</p>
                      )}
                    </div>
                    <span className={`badge badge-${template.status === 'active' ? 'success' : 'warning'}`}>
                      {template.status}
                    </span>
                  </div>
                  <div className="template-item-meta">
                    <div className="template-item-tags">
                      {template.document_type && (
                        <span className="tag">{template.document_type}</span>
                      )}
                      {template.industry && (
                        <span className="tag">{template.industry}</span>
                      )}
                    </div>
                    <div className="template-item-stats">
                      <span>{template.documentsGenerated || 0} documents</span>
                      <span>•</span>
                      <span>{new Date(template.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="template-item-actions">
                    <Link
                      to={`/templates/${template.id}/fill`}
                      className="btn btn-primary btn-sm"
                    >
                      Use Template
                    </Link>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Templates;

