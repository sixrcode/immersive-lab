"use client";

import React, { useEffect, useState } from 'react';

interface Document {
  _id: string;
  title: string;
  projectId: string;
}

interface DocumentListProps {
  projectId: string;
  onSelectDocument: (documentId: string) => void;
  selectedDocumentId?: string;
}

const DocumentList: React.FC<DocumentListProps> = ({ projectId, onSelectDocument, selectedDocumentId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    const fetchDocuments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_COLLABORATION_API_BASE_URL || '/api/collaboration';
        // Corrected API path according to routes/documents.ts: /api/projects/:projectId/documents
        const response = await fetch(`${baseUrl}/documents/projects/${projectId}/documents`);
        if (!response.ok) {
          throw new Error(`Failed to fetch documents: ${response.statusText} (Status: ${response.status})`);
        }
        const data = await response.json();
        setDocuments(data);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
        console.error(`Error fetching documents for project ${projectId}:`, err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [projectId]);

  if (isLoading) {
    return <div className="p-3"><p className="text-sm text-gray-400">Loading documents...</p></div>;
  }

  if (error) {
    return <div className="p-3 text-red-400 text-sm"><p>Error: {error}</p></div>;
  }

  if (documents.length === 0) {
    return <div className="p-3"><p className="text-sm text-gray-400">No documents in this project.</p> <button className="mt-2 text-xs p-1 bg-green-600 hover:bg-green-700 rounded">+ Create Document</button></div>;
  }

  return (
    <div className="text-white p-1 md:p-0">
      <h3 className="text-lg font-semibold mb-2">Documents</h3>
      <ul className="space-y-1 max-h-48 md:max-h-full overflow-y-auto">
        {documents.map((doc) => (
          <li key={doc._id}>
            <button
              onClick={() => onSelectDocument(doc._id)}
              className={`w-full text-left p-1.5 text-sm rounded hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                doc._id === selectedDocumentId ? 'bg-blue-600 font-medium' : 'bg-gray-700/40'
              }`}
            >
              {doc.title}
            </button>
          </li>
        ))}
      </ul>
       {/* Placeholder for creating a new document */}
      <div className="mt-3">
        <button className="w-full p-1.5 text-sm bg-green-600 hover:bg-green-700 rounded">
          + Add New Document
        </button>
      </div>
    </div>
  );
};

export default DocumentList;
