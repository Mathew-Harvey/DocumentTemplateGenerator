import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadSessionsApi, templatesApi } from '../services/api';
import './CreateTemplate.css';

function CreateTemplate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: upload, 2: analyzing, 3: review, 4: save
  const [sessionId, setSessionId] = useState(null);
  const [files, setFiles] = useState([null, null, null]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const handleFileChange = (index, file) => {
    const newFiles = [...files];
    newFiles[index] = file;
    setFiles(newFiles);
  };

  const handleStartUpload = async () => {
    try {
      setUploading(true);
      
      // Create upload session
      const session = await uploadSessionsApi.create();
      setSessionId(session.sessionId);

      // Upload files
      for (let i = 0; i < files.length; i++) {
        if (files[i]) {
          await uploadSessionsApi.upload(session.sessionId, files[i], i);
        }
      }

      setStep(2);
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      
      // Start analysis
      await uploadSessionsApi.analyze(sessionId);

      // Poll for results
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max (10 second intervals)
      
      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const status = await uploadSessionsApi.getStatus(sessionId);
          
          if (status.status === 'review' || status.status === 'completed') {
            clearInterval(pollInterval);
            setAnalysisResult(status);
            setTemplateName(status.documentType ? `${status.documentType} Template` : 'New Template');
            setAnalyzing(false);
            setStep(3);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setAnalyzing(false);
            alert('Analysis failed: ' + status.analysisLog);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setAnalyzing(false);
            alert('Analysis timeout. Please try again.');
          }
        } catch (error) {
          clearInterval(pollInterval);
          setAnalyzing(false);
          alert('Error checking status: ' + error.message);
        }
      }, 10000); // Poll every 10 seconds
    } catch (error) {
      setAnalyzing(false);
      alert('Analysis failed: ' + error.message);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      await templatesApi.create({
        sessionId,
        name: templateName,
        description: templateDescription,
        documentType: analysisResult.documentType,
        industry: analysisResult.industry,
      });

      alert('Template created successfully!');
      navigate('/templates');
    } catch (error) {
      alert('Failed to create template: ' + error.message);
    }
  };

  return (
    <div className="create-template-page">
      <header className="app-header">
        <div className="container app-header-content">
          <div className="app-logo">Document Template Generator</div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">Create New Template</h1>
            <p className="page-description">
              Upload 3 similar documents to generate a custom template
            </p>
          </div>

          <div className="wizard-progress">
            <div className={`wizard-step ${step >= 1 ? 'active' : ''}`}>
              <div className="wizard-step-number">1</div>
              <div className="wizard-step-label">Upload</div>
            </div>
            <div className={`wizard-step ${step >= 2 ? 'active' : ''}`}>
              <div className="wizard-step-number">2</div>
              <div className="wizard-step-label">Analyze</div>
            </div>
            <div className={`wizard-step ${step >= 3 ? 'active' : ''}`}>
              <div className="wizard-step-number">3</div>
              <div className="wizard-step-label">Review</div>
            </div>
            <div className={`wizard-step ${step >= 4 ? 'active' : ''}`}>
              <div className="wizard-step-number">4</div>
              <div className="wizard-step-label">Save</div>
            </div>
          </div>

          {step === 1 && (
            <div className="wizard-content card">
              <h2>Upload 3 Example Documents</h2>
              <p className="help-text">
                Upload 3 similar Word documents (.docx) to analyze their structure and content.
              </p>

              <div className="file-uploads">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="file-upload-box">
                    <label className="file-upload-label">
                      <input
                        type="file"
                        accept=".docx"
                        onChange={(e) => handleFileChange(index, e.target.files[0])}
                        className="file-upload-input"
                      />
                      <div className="file-upload-content">
                        {files[index] ? (
                          <>
                            <div className="file-icon">📄</div>
                            <div className="file-name">{files[index].name}</div>
                          </>
                        ) : (
                          <>
                            <div className="file-icon">⬆️</div>
                            <div>Click to upload Document {index + 1}</div>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="wizard-actions">
                <button
                  onClick={handleStartUpload}
                  className="btn btn-primary"
                  disabled={!files.every((f) => f) || uploading}
                >
                  {uploading ? 'Uploading...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && !analyzing && (
            <div className="wizard-content card">
              <h2>Ready to Analyze</h2>
              <p>All 3 documents have been uploaded successfully.</p>
              <div className="wizard-actions">
                <button onClick={handleAnalyze} className="btn btn-primary">
                  Start Analysis
                </button>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="wizard-content card">
              <div className="analyzing-state">
                <div className="spinner"></div>
                <h2>Analyzing Documents...</h2>
                <p>This may take up to 2 minutes. Please wait.</p>
              </div>
            </div>
          )}

          {step === 3 && analysisResult && (
            <div className="wizard-content card">
              <h2>Review Analysis Results</h2>
              <div className="analysis-summary">
                <div className="analysis-item">
                  <strong>Document Type:</strong> {analysisResult.documentType || 'Unknown'}
                </div>
                <div className="analysis-item">
                  <strong>Industry:</strong> {analysisResult.industry || 'Unknown'}
                </div>
                <div className="analysis-item">
                  <strong>Confidence Score:</strong>{' '}
                  <span className={`confidence-score ${analysisResult.confidenceScore >= 0.7 ? 'good' : 'warning'}`}>
                    {((analysisResult.confidenceScore || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="analysis-item">
                  <strong>Fields Identified:</strong>{' '}
                  {analysisResult.schemaJson?.sections?.reduce((sum, s) => sum + (s.fields?.length || 0), 0) || 0}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Template Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  className="form-textarea"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="wizard-actions">
                <button onClick={handleSaveTemplate} className="btn btn-primary">
                  Save Template
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default CreateTemplate;

