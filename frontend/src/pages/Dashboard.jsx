import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { templatesApi, documentsApi } from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [templatesData, documentsData] = await Promise.all([
        templatesApi.getAll({ status: 'active' }),
        documentsApi.getAll({ limit: 5 }),
      ]);

      setTemplates(templatesData.templates || []);
      setDocuments(documentsData.documents || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="app-header">
        <div className="container app-header-content">
          <Link to="/dashboard" className="app-logo">
            Document Template Generator
          </Link>
          <nav className="app-nav">
            <Link to="/dashboard" className="active">Dashboard</Link>
            <Link to="/templates">Templates</Link>
            <button onClick={handleSignOut} className="btn btn-outline">
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">Dashboard</h1>
            <p className="page-description">
              Welcome back, {user?.email}
            </p>
          </div>

          <div className="dashboard-stats">
            <div className="stat-card card">
              <div className="stat-label">Total Templates</div>
              <div className="stat-value">{templates.length}</div>
            </div>
            <div className="stat-card card">
              <div className="stat-label">Documents Generated</div>
              <div className="stat-value">
                {templates.reduce((sum, t) => sum + (t.documentsGenerated || 0), 0)}
              </div>
            </div>
          </div>

          <div className="dashboard-actions">
            <Link to="/templates/create" className="btn btn-primary">
              + Create New Template
            </Link>
          </div>

          <div className="dashboard-sections">
            <section className="dashboard-section">
              <h2 className="section-title">Your Templates</h2>
              {templates.length === 0 ? (
                <div className="empty-state card">
                  <p>No templates yet. Create your first template to get started.</p>
                  <Link to="/templates/create" className="btn btn-primary">
                    Create Template
                  </Link>
                </div>
              ) : (
                <div className="templates-grid">
                  {templates.map((template) => (
                    <div key={template.id} className="template-card card">
                      <h3 className="template-name">{template.name}</h3>
                      <p className="template-type">{template.document_type}</p>
                      <div className="template-meta">
                        <span className="template-docs">
                          {template.documentsGenerated} documents
                        </span>
                      </div>
                      <div className="template-actions">
                        <Link
                          to={`/templates/${template.id}/fill`}
                          className="btn btn-primary btn-sm"
                        >
                          Use Template
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-section">
              <h2 className="section-title">Recent Documents</h2>
              {documents.length === 0 ? (
                <div className="empty-state card">
                  <p>No documents generated yet.</p>
                </div>
              ) : (
                <div className="card">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Template</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td>{doc.name}</td>
                          <td>{doc.templateName}</td>
                          <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                          <td>
                            <a
                              href={documentsApi.getDownloadUrl(doc.id)}
                              className="btn btn-outline btn-sm"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Download
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;

