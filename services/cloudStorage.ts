
import { CloudProject, UserComment, RapStyle, Collaborator } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

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

  // Helper: Convert Supabase project to CloudProject
  private supabaseToCloudProject(row: any): CloudProject {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      content: row.content,
      style: row.style as RapStyle,
      lastModified: row.last_modified || new Date(row.created_at).getTime(),
      comments: Array.isArray(row.comments) ? row.comments : []
    };
  }

  // Helper: Convert CloudProject to Supabase format
  private cloudProjectToSupabase(project: CloudProject): any {
    return {
      id: project.id,
      user_id: project.userId,
      title: project.title,
      content: project.content,
      style: project.style,
      last_modified: project.lastModified || Date.now(),
      comments: project.comments || []
    };
  }

  // Local Storage fallback methods
  private getAllLocal(): CloudProject[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private saveLocal(projects: CloudProject[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(projects));
  }

  // Sync projects from Supabase to localStorage (for offline access)
  private async syncToLocal(userId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('last_modified', { ascending: false });

      if (error) throw error;

      const allProjects = this.getAllLocal();
      const userProjects = allProjects.filter(p => p.userId !== userId);
      
      if (data) {
        const syncedProjects = data.map(row => this.supabaseToCloudProject(row));
        this.saveLocal([...userProjects, ...syncedProjects]);
      }
    } catch (err) {
      console.warn('Failed to sync projects from Supabase to local:', err);
    }
  }

  // Get projects: Try Supabase first, fallback to localStorage
  public async getProjects(userId: string): Promise<CloudProject[]> {
    // Skip Supabase for demo/offline users
    if (userId.startsWith('demo-') || userId.startsWith('offline-')) {
      return this.getAllLocal().filter(p => p.userId === userId);
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('last_modified', { ascending: false });

        if (error) throw error;

        // اگر درخواست موفق باشد (حتی اگر آرایه خالی باشد)،
        // وضعیت Supabase را به‌عنوان منبع حقیقت در نظر می‌گیریم.
        if (data) {
          const projects = data.map(row => this.supabaseToCloudProject(row));
          // به‌روزرسانی کش محلی برای این کاربر (پاک کردن پروژه‌های قبلی و جایگزینی با فعلی)
          const allProjects = this.getAllLocal();
          const otherProjects = allProjects.filter(p => p.userId !== userId);
          this.saveLocal([...otherProjects, ...projects]);
          return projects;
        }
      } catch (err) {
        console.warn('Failed to fetch projects from Supabase, using local storage:', err);
      }
    }

    // Fallback to localStorage
    return this.getAllLocal().filter(p => p.userId === userId);
  }

  // Get single project
  public async getProject(id: string): Promise<CloudProject | undefined> {
    const localProject = this.getAllLocal().find(p => p.id === id);
    
    // Skip Supabase for demo/offline users
    if (localProject && (localProject.userId.startsWith('demo-') || localProject.userId.startsWith('offline-'))) {
      return localProject;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          const project = this.supabaseToCloudProject(data);
          // Update local cache
          const allProjects = this.getAllLocal();
          const index = allProjects.findIndex(p => p.id === id);
          if (index > -1) {
            allProjects[index] = project;
          } else {
            allProjects.push(project);
          }
          this.saveLocal(allProjects);
          return project;
        }
      } catch (err) {
        console.warn('Failed to fetch project from Supabase, using local storage:', err);
      }
    }

    return localProject;
  }

  // Save project: Save to both Supabase and localStorage
  public async saveProject(project: CloudProject): Promise<void> {
    const updatedProject = { ...project, lastModified: Date.now() };
    
    // Update local storage immediately
    const allProjects = this.getAllLocal();
    const index = allProjects.findIndex(p => p.id === project.id);
    if (index > -1) {
      allProjects[index] = updatedProject;
    } else {
      allProjects.push(updatedProject);
    }
    this.saveLocal(allProjects);

    // Skip Supabase for demo/offline users
    if (project.userId.startsWith('demo-') || project.userId.startsWith('offline-')) {
      return;
    }

    // Save to Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const supabaseData = this.cloudProjectToSupabase(updatedProject);
        
        const { error } = await supabase
          .from('projects')
          .upsert(supabaseData, { onConflict: 'id' });

        if (error) throw error;
      } catch (err) {
        console.error('Failed to save project to Supabase:', err);
        // Project is still saved locally, so we don't throw
      }
    }
  }

  // Delete project: Delete from both Supabase and localStorage
  public async deleteProject(id: string): Promise<void> {
    const project = this.getAllLocal().find(p => p.id === id);
    
    // Update local storage immediately
    const allProjects = this.getAllLocal().filter(p => p.id !== id);
    this.saveLocal(allProjects);

    // Skip Supabase for demo/offline users
    if (project && (project.userId.startsWith('demo-') || project.userId.startsWith('offline-'))) {
      return;
    }

    // Delete from Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete project from Supabase:', err);
        // Project is still deleted locally, so we don't throw
      }
    }
  }

  // Add comment: Update both Supabase and localStorage
  public async addComment(projectId: string, comment: Omit<UserComment, 'id' | 'timestamp'>): Promise<UserComment> {
    const project = await this.getProject(projectId);
    if (!project) throw new Error("Project not found");

    const newComment: UserComment = {
      ...comment,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };

    project.comments.push(newComment);
    await this.saveProject(project);
    return newComment;
  }

  // Sync projects from Supabase (useful for manual refresh)
  public async syncProjects(userId: string): Promise<void> {
    await this.syncToLocal(userId);
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
