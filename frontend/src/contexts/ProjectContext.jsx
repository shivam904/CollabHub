import { createContext, useContext } from 'react';

const ProjectContext = createContext({ projectId: null, userId: null });

export function ProjectProvider({ projectId, userId, children }) {
  return (
    <ProjectContext.Provider value={{ projectId, userId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  return useContext(ProjectContext);
} 