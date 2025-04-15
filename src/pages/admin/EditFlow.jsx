import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import Card from '../../components/Card';
import { ArrowLeftIcon, TrashIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline';

// Question types
const QUESTION_TYPES = [
  { id: 'short_answer', label: 'Short Answer' },
  { id: 'long_answer', label: 'Long Answer' },
  { id: 'dropdown', label: 'Dropdown' },
  { id: 'multiple_choice', label: 'Multiple Choice' },
  { id: 'yes_no', label: 'Yes/No' },
  { id: 'file_upload', label: 'File Upload' },
  { id: 'color', label: 'Color Picker' }
];

export default function EditFlow() {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const { user, workspaceId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flow, setFlow] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sections: []
  });
  const [selectedSection, setSelectedSection] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchFlow() {
      if (!workspaceId || !flowId) {
        console.log('Missing required data:', { workspaceId, flowId });
        return;
      }

      try {
        console.log('Fetching flow:', { workspaceId, flowId });
        const flowRef = doc(db, 'workspaces', workspaceId, 'flows', flowId);
        const flowDoc = await getDoc(flowRef);

        if (!flowDoc.exists()) {
          console.log('Flow document not found');
          toast.error('Flow not found');
          navigate('/admin/flows');
          return;
        }

        const flowData = flowDoc.data();
        console.log('Flow document data:', flowData);

        // Handle both steps and sections for backward compatibility
        const sections = flowData.sections || flowData.steps || [];
        console.log('Found sections:', sections);

        // Map the sections to ensure they have all required fields
        const processedSections = sections.map(section => ({
          id: section.id || `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: section.name || section.title || 'Untitled Section',
          description: section.description || '',
          questions: (section.questions || []).map(q => ({
            id: q.id || `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: q.text || q.label || '',
            type: q.type || 'short_answer',
            required: q.required || false,
            options: q.options || []
          }))
        }));

        setFlow(flowData);
        setFormData({
          name: flowData.name || '',
          description: flowData.description || '',
          sections: processedSections
        });

        if (processedSections.length > 0) {
          console.log('Selecting first section:', processedSections[0]);
          setSelectedSection(processedSections[0]);
        }
      } catch (error) {
        console.error('Error fetching flow:', error);
        toast.error('Failed to load flow data');
      } finally {
        setLoading(false);
      }
    }

    fetchFlow();
  }, [flowId, workspaceId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workspaceId || !flowId) return;

    setSaving(true);
    try {
      const flowRef = doc(db, 'workspaces', workspaceId, 'flows', flowId);
      await updateDoc(flowRef, {
        name: formData.name,
        description: formData.description,
        sections: formData.sections,
        updatedAt: new Date()
      });

      toast.success('Flow updated successfully');
      navigate('/admin/flows');
    } catch (error) {
      console.error('Error updating flow:', error);
      toast.error('Failed to update flow');
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(formData.sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormData(prev => ({
      ...prev,
      sections: items
    }));

    // Update selected section if it was moved
    if (selectedSection && selectedSection.id === reorderedItem.id) {
      setSelectedSection(reorderedItem);
    }
  };

  const handleAddSection = () => {
    if (!newSectionName.trim()) {
      toast.error('Please enter a section name');
      return;
    }

    const newSection = {
      id: `section-${Date.now()}`,
      name: newSectionName.trim(),
      description: newSectionDescription.trim(),
      questions: []
    };

    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));

    setNewSectionName('');
    setNewSectionDescription('');
    setIsAddingSection(false);
    setSelectedSection(newSection);
  };

  const handleUpdateSection = (sectionId, field, value) => {
    setFormData(prev => {
      const updatedSections = prev.sections.map(section => {
        if (section.id === sectionId) {
          return { ...section, [field]: value };
        }
        return section;
      });
      return { ...prev, sections: updatedSections };
    });
  };

  const handleDeleteSection = (sectionId) => {
    if (!window.confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
      return;
    }

    const updatedSections = formData.sections.filter(section => section.id !== sectionId);
    setFormData(prev => ({ ...prev, sections: updatedSections }));
    
    if (selectedSection?.id === sectionId) {
      setSelectedSection(updatedSections[0] || null);
    }

    toast.success('Section deleted successfully');
  };

  const handleAddQuestion = (sectionId) => {
    const newQuestion = {
      id: `question-${Date.now()}`,
      text: '',
      type: 'short_answer',
      required: false
    };

    setFormData(prev => {
      const updatedSections = prev.sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            questions: [...(section.questions || []), newQuestion]
          };
        }
        return section;
      });
      return { ...prev, sections: updatedSections };
    });
  };

  const handleQuestionChange = (sectionId, questionId, field, value) => {
    setFormData(prev => {
      const updatedSections = prev.sections.map(section => {
        if (section.id === sectionId) {
          const updatedQuestions = section.questions.map(question => {
            if (question.id === questionId) {
              return { ...question, [field]: value };
            }
            return question;
          });
          return { ...section, questions: updatedQuestions };
        }
        return section;
      });
      return { ...prev, sections: updatedSections };
    });
  };

  const handleDeleteQuestion = (sectionId, questionId) => {
    setFormData(prev => {
      const updatedSections = prev.sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            questions: section.questions.filter(q => q.id !== questionId)
          };
        }
        return section;
      });
      return { ...prev, sections: updatedSections };
    });
  };

  const handleDelete = async () => {
    if (!workspaceId || !flowId) return;

    setIsDeleting(true);
    try {
      const flowRef = doc(db, 'workspaces', workspaceId, 'flows', flowId);
      await deleteDoc(flowRef);
      toast.success('Flow deleted successfully');
      navigate('/admin/flows');
    } catch (err) {
      console.error('Error deleting flow:', err);
      toast.error('Failed to delete flow');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading flow data...</p>
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Flow Not Found</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">The flow you're looking for doesn't exist or you don't have permission to access it.</p>
          <button
            onClick={() => navigate('/admin/flows')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Flows
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/admin/flows')}
          className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mr-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back to Flows
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Flow</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Flow Details */}
        <div className="lg:col-span-1">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Flow Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter flow name"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter flow description"
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/flows')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </Card>

          {/* Sections List */}
          <Card className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sections</h2>
              <button
                onClick={() => setIsAddingSection(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Section
              </button>
            </div>

            {isAddingSection && (
              <div className="mb-4 p-4 rounded-md bg-gray-50 dark:bg-gray-800">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Section Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter section name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newSectionDescription}
                      onChange={(e) => setNewSectionDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter section description"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setIsAddingSection(false)}
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSection}
                      className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                      Add Section
                    </button>
                  </div>
                </div>
              </div>
            )}

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sections">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {formData.sections.map((section, index) => (
                      <Draggable key={section.id} draggableId={section.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-3 rounded-md ${
                              selectedSection?.id === section.id
                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div
                                {...provided.dragHandleProps}
                                className="flex-1 cursor-pointer"
                                onClick={() => setSelectedSection(section)}
                              >
                                <div className="flex items-center">
                                  <div className="mr-2 text-gray-400 dark:text-gray-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                    </svg>
                                  </div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {section.name}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditingSection(editingSection?.id === section.id ? null : section)}
                                  className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSection(section.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {editingSection?.id === section.id && (
                              <div className="mt-3 space-y-3">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Section Name
                                  </label>
                                  <input
                                    type="text"
                                    value={section.name}
                                    onChange={(e) => handleUpdateSection(section.id, 'name', e.target.value)}
                                    className="w-full px-3 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Description
                                  </label>
                                  <textarea
                                    value={section.description || ''}
                                    onChange={(e) => handleUpdateSection(section.id, 'description', e.target.value)}
                                    className="w-full px-3 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    rows={2}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </Card>
        </div>

        {/* Right Column - Section Details */}
        <div className="lg:col-span-2">
          <Card>
            {selectedSection ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedSection.name}
                  </h2>
                  <button
                    onClick={() => handleAddQuestion(selectedSection.id)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Question
                  </button>
                </div>

                {selectedSection.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedSection.description}
                  </p>
                )}

                <div className="space-y-4">
                  {selectedSection.questions?.map((question) => (
                    <div key={question.id} className="p-4 rounded-md bg-gray-50 dark:bg-gray-800">
                      <div className="flex justify-between items-start mb-4">
                        <input
                          type="text"
                          value={question.text}
                          onChange={(e) => handleQuestionChange(selectedSection.id, question.id, 'text', e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Question text"
                        />
                        <button
                          onClick={() => handleDeleteQuestion(selectedSection.id, question.id)}
                          className="ml-3 p-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Question Type
                          </label>
                          <select
                            value={question.type}
                            onChange={(e) => handleQuestionChange(selectedSection.id, question.id, 'type', e.target.value)}
                            className="w-full px-3 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            {QUESTION_TYPES.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`required-${question.id}`}
                            checked={question.required}
                            onChange={(e) => handleQuestionChange(selectedSection.id, question.id, 'required', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                          <label htmlFor={`required-${question.id}`} className="text-sm text-gray-700 dark:text-gray-300">
                            Required
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Select a Section
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Choose a section from the list to view and edit its questions
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Flow"
        message="Are you sure you want to delete this flow? This action cannot be undone."
      />
    </div>
  );
} 