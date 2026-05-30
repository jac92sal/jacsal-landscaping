import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, GripVertical, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Question {
  id: string;
  question_type: 'screening_one' | 'screening_two';
  field_name: string;
  field_label: string;
  field_type: string;
  placeholder: string;
  is_required: boolean;
  options: Array<{ label: string; value: string }> | null;
  sort_order: number;
  is_active: boolean;
}

export function QuestionsManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'screening_one' | 'screening_two'>('screening_one');
  const [formData, setFormData] = useState({
    question_type: 'screening_one' as 'screening_one' | 'screening_two',
    field_name: '',
    field_label: '',
    field_type: 'text',
    placeholder: '',
    is_required: false,
    options: '',
  });

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('screening_questions')
        .select('*')
        .order('question_type', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.field_name || !formData.field_label) return;

    try {
      const questionsOfType = questions.filter((q) => q.question_type === activeTab);
      const maxOrder = Math.max(...questionsOfType.map((q) => q.sort_order), 0);

      let options = null;
      if (formData.field_type === 'select' && formData.options) {
        try {
          options = JSON.parse(formData.options);
        } catch {
          alert('Invalid JSON for options. Use format: [{"label": "Option 1", "value": "opt1"}]');
          return;
        }
      }

      const { error } = await supabase.from('screening_questions').insert({
        question_type: activeTab,
        field_name: formData.field_name,
        field_label: formData.field_label,
        field_type: formData.field_type,
        placeholder: formData.placeholder || null,
        is_required: formData.is_required,
        options,
        sort_order: maxOrder + 1,
      });

      if (error) throw error;

      setFormData({
        question_type: activeTab,
        field_name: '',
        field_label: '',
        field_type: 'text',
        placeholder: '',
        is_required: false,
        options: '',
      });
      setShowAddForm(false);
      loadQuestions();
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Error adding question. Please try again.');
    }
  };

  const handleUpdate = async (id: string) => {
    const question = questions.find((q) => q.id === id);
    if (!question) return;

    try {
      const { error } = await supabase
        .from('screening_questions')
        .update({
          field_label: question.field_label,
          placeholder: question.placeholder,
          is_required: question.is_required,
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      loadQuestions();
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Error updating question. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase.from('screening_questions').delete().eq('id', id);

      if (error) throw error;
      loadQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Error deleting question. Please try again.');
    }
  };

  const toggleActive = async (id: string) => {
    const question = questions.find((q) => q.id === id);
    if (!question) return;

    try {
      const { error } = await supabase
        .from('screening_questions')
        .update({ is_active: !question.is_active })
        .eq('id', id);

      if (error) throw error;
      loadQuestions();
    } catch (error) {
      console.error('Error toggling question:', error);
      alert('Error updating question. Please try again.');
    }
  };

  const filteredQuestions = questions.filter((q) => q.question_type === activeTab);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2">Screening Questions</h2>
          <p className="text-muted-foreground">
            Customize the questions shown in each screening step
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('screening_one')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'screening_one'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Screening One ({questions.filter((q) => q.question_type === 'screening_one').length})
        </button>
        <button
          onClick={() => setActiveTab('screening_two')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'screening_two'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Screening Two ({questions.filter((q) => q.question_type === 'screening_two').length})
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3>Add Question to {activeTab === 'screening_one' ? 'Screening One' : 'Screening Two'}</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Field Name (ID)</label>
              <input
                type="text"
                value={formData.field_name}
                onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                placeholder="e.g., company_size"
              />
              <p className="text-xs text-muted-foreground mt-1">Use snake_case, no spaces</p>
            </div>

            <div>
              <label className="block mb-2">Field Label (Display)</label>
              <input
                type="text"
                value={formData.field_label}
                onChange={(e) => setFormData({ ...formData, field_label: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., Company Size"
              />
            </div>

            <div>
              <label className="block mb-2">Field Type</label>
              <select
                value={formData.field_type}
                onChange={(e) => setFormData({ ...formData, field_type: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="tel">Phone</option>
                <option value="number">Number</option>
                <option value="textarea">Textarea</option>
                <option value="select">Select Dropdown</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">Placeholder</label>
              <input
                type="text"
                value={formData.placeholder}
                onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Placeholder text..."
              />
            </div>

            {formData.field_type === 'select' && (
              <div className="md:col-span-2">
                <label className="block mb-2">Options (JSON)</label>
                <textarea
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                  placeholder='[{"label": "Option 1", "value": "opt1"}, {"label": "Option 2", "value": "opt2"}]'
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_required}
                  onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                />
                <span>Required Field</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={!formData.field_name || !formData.field_label}
            className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Question
          </button>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-3">
        {filteredQuestions.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              No questions yet. Add your first question to get started.
            </p>
          </div>
        ) : (
          filteredQuestions.map((question) => {
            const isEditing = editingId === question.id;

            return (
              <div
                key={question.id}
                className={`bg-card border rounded-lg p-4 ${
                  question.is_active ? 'border-border' : 'border-border/50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 hover:bg-muted rounded-lg cursor-grab">
                    <GripVertical className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={question.field_label}
                          onChange={(e) => {
                            setQuestions(
                              questions.map((q) =>
                                q.id === question.id ? { ...q, field_label: e.target.value } : q
                              )
                            );
                          }}
                          className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <input
                          type="text"
                          value={question.placeholder || ''}
                          onChange={(e) => {
                            setQuestions(
                              questions.map((q) =>
                                q.id === question.id ? { ...q, placeholder: e.target.value } : q
                              )
                            );
                          }}
                          className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                          placeholder="Placeholder"
                        />
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={question.is_required}
                            onChange={(e) => {
                              setQuestions(
                                questions.map((q) =>
                                  q.id === question.id ? { ...q, is_required: e.target.checked } : q
                                )
                              );
                            }}
                            className="w-4 h-4 rounded border-border"
                          />
                          <span className="text-sm">Required</span>
                        </label>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{question.field_label}</span>
                          {question.is_required && (
                            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono">{question.field_name}</span>
                          <span>•</span>
                          <span>{question.field_type}</span>
                        </div>
                        {question.placeholder && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Placeholder: "{question.placeholder}"
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={question.is_active}
                        onChange={() => toggleActive(question.id)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <span className="text-sm">Active</span>
                    </label>

                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleUpdate(question.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors text-secondary"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingId(question.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(question.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
