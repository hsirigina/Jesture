import { supabase } from '../lib/supabase'

export const workflowService = {
  // Get all workflows for current user
  async getWorkflows() {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Get single workflow by ID
  async getWorkflow(id) {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Create new workflow
  async createWorkflow(name, description = '') {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('workflows')
      .insert({
        user_id: user.id,
        name,
        description,
        workflow_data: { nodes: [], connections: [] },
        active: false
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update workflow
  async updateWorkflow(id, updates) {
    const { data, error } = await supabase
      .from('workflows')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete workflow
  async deleteWorkflow(id) {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Activate workflow (deactivates others automatically via DB trigger)
  async activateWorkflow(id) {
    const { data, error } = await supabase
      .from('workflows')
      .update({ active: true })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Deactivate workflow
  async deactivateWorkflow(id) {
    const { data, error } = await supabase
      .from('workflows')
      .update({ active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get active workflow
  async getActiveWorkflow() {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
    return data
  }
}
