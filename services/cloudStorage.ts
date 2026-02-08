

import { supabase } from './supabase';
import { CloudProject, UserComment, RapStyle, Collaborator } from '../types';

export interface ActivityLog {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
}

class CloudStorageService {
  private static instance: CloudStorageService;

  private constructor() {}

  public static getInstance(): CloudStorageService {
    if (!CloudStorageService.instance) {
      CloudStorageService.instance = new CloudStorageService();
    }
    return CloudStorageService.instance;
  }

  // --- Projects ---

  public async getProjects(userId: string): Promise<CloudProject[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return [];
    }

    // Map Supabase fields to CloudProject type
    return data.map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      title: p.title,
      content: p.content,
      style: p.style as RapStyle,
      lastModified: p.last_modified || new Date(p.created_at).getTime(),
      comments: p.comments || [],
      aiAnalysis: p.ai_analysis
    }));
  }

  public async saveProject(project: CloudProject): Promise<boolean> {
    const payload: any = {
       user_id: project.userId,
       title: project.title,
       content: project.content,
       style: project.style,
       ai_analysis: project.aiAnalysis,
       last_modified: Date.now(),
       comments: project.comments
    };

    // If ID looks like a UUID (length 36), use it. Otherwise let DB create one (insert)
    if (project.id && project.id.length === 36) {
        payload.id = project.id;
    } else if (project.id) {
        // Fallback for passing local IDs if needed, though typically UUIDs are preferred
        payload.id = project.id;
    }

    const { error } = await supabase
      .from('projects')
      .upsert(payload);

    if (error) {
      console.error('Error saving project:', error);
      return false;
    }
    
    await this.logActivity(project.userId, 'save_project', `پروژه "${project.title}" ذخیره شد.`);
    return true;
  }

  public async deleteProject(id: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting project:', error);
      return false;
    }
    return true;
  }

  // --- Activity Logs ---

  public async logActivity(userId: string, actionType: string, description: string): Promise<void> {
    // Fire and forget
    supabase.from('activity_logs').insert({
        user_id: userId,
        action_type: actionType,
        description: description
    }).then(({ error }) => {
        if (error) console.error("Log error", error);
    });
  }

  public async getActivityLogs(userId: string): Promise<ActivityLog[]> {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) return [];
      return data as ActivityLog[];
  }

  // --- Comments (Simulated mainly, but can update project) ---

  public async addComment(projectId: string, comment: Omit<UserComment, 'id' | 'timestamp'>): Promise<UserComment | null> {
    // First fetch project comments
    const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('comments')
        .eq('id', projectId)
        .single();
    
    if (fetchError || !project) return null;

    const newComment: UserComment = {
      ...comment,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };

    const updatedComments = [...(project.comments || []), newComment];

    const { error: updateError } = await supabase
        .from('projects')
        .update({ comments: updatedComments })
        .eq('id', projectId);

    if (updateError) return null;
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