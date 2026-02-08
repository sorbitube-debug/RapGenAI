
import { CloudProject, UserComment, RapStyle, Collaborator } from '../types';

class CloudStorageService {
  private static instance: CloudStorageService;
  private storageKey = 'rapgen_cloud_projects_v2';

  private constructor() {}

  public static getInstance(): CloudStorageService {
    if (!CloudStorageService.instance) {
      CloudStorageService.instance = new CloudStorageService();
    }
    return CloudStorageService.instance;
  }

  private getAll(): CloudProject[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  public getProjects(userId: string): CloudProject[] {
    return this.getAll().filter(p => p.userId === userId);
  }

  public getProject(id: string): CloudProject | undefined {
    return this.getAll().find(p => p.id === id);
  }

  public saveProject(project: CloudProject): void {
    const projects = this.getAll();
    const index = projects.findIndex(p => p.id === project.id);
    if (index > -1) {
      projects[index] = { ...project, lastModified: Date.now() };
    } else {
      projects.push({ ...project, lastModified: Date.now() });
    }
    localStorage.setItem(this.storageKey, JSON.stringify(projects));
  }

  public deleteProject(id: string): void {
    const projects = this.getAll().filter(p => p.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(projects));
  }

  public addComment(projectId: string, comment: Omit<UserComment, 'id' | 'timestamp'>): UserComment {
    const project = this.getProject(projectId);
    if (!project) throw new Error("Project not found");

    const newComment: UserComment = {
      ...comment,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };

    project.comments.push(newComment);
    this.saveProject(project);
    return newComment;
  }

  public getSimulatedCollaborators(): Collaborator[] {
    return [
      { id: 'u1', name: 'Alireza_Pro', color: '#ef4444', isOnline: true },
      { id: 'u2', name: 'Yas_Fan', color: '#3b82f6', isOnline: true },
      { id: 'u3', name: 'BeatMaker_TX', color: '#10b981', isOnline: false }
    ];
  }
}

export const cloudStorage = CloudStorageService.getInstance();
