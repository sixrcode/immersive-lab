"use client";

import React, { useEffect, useState } from 'react';

interface Project {
  _id: string;
  name: string;
  description?: string;
}

interface ProjectListProps {
  onSelectProject: (projectId: string) => void;
  selectedProjectId?: string;
}

const ProjectList: React.FC<ProjectListProps> = ({ onSelectProject, selectedProjectId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_COLLABORATION_API_BASE_URL || '/api/collaboration';
        const response = await fetch(`${baseUrl}/projects`);
        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }
        const data = await response.json();
        setProjects(data);
      } catch (err: unknown) {
        setError(err.message || 'An unknown error occurred.');
        console.error("Error fetching projects:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (isLoading) {
    return <div className="p-4"><p>Loading projects...</p></div>;
  }

  if (error) {
    return <div className="p-4 text-red-500"><p>Error: {error}</p></div>;
  }

  if (projects.length === 0) {
    return <div className="p-4"><p>No projects found. Create one to get started!</p></div>;
  }

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md h-full">
      <h2 className="text-xl font-semibold mb-3">Projects</h2>
      <ul className="space-y-2">
        {projects.map((project) => (
          <li key={project._id}>
            <button
              onClick={() => onSelectProject(project._id)}
              className={`w-full text-left p-2 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                project._id === selectedProjectId ? 'bg-blue-600 font-semibold' : 'bg-gray-700/50'
              }`}
            >
              {project.name}
            </button>
          </li>
        ))}
      </ul>
      {/* Placeholder for creating a new project */}
      <div className="mt-4">
        <button className="w-full p-2 bg-green-600 hover:bg-green-700 rounded">
          + Create New Project
        </button>
      </div>
    </div>
  );
};

export default ProjectList;
