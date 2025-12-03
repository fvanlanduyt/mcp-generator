import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import Card, { CardHeader, CardBody } from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input, { Textarea } from '../components/Input'
import { holidayTypesApi } from '../api/client'

const emptyType = {
  name: '',
  description: '',
  color: '#14b8a6',
  requires_approval: true,
  max_days_per_request: 30,
}

export default function HolidayTypes() {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [formData, setFormData] = useState(emptyType)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTypes()
  }, [])

  async function fetchTypes() {
    try {
      const data = await holidayTypesApi.getAll()
      setTypes(data)
    } catch (error) {
      console.error('Failed to fetch holiday types:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingType(null)
    setFormData(emptyType)
    setModalOpen(true)
  }

  function openEditModal(type) {
    setEditingType(type)
    setFormData({
      name: type.name,
      description: type.description || '',
      color: type.color,
      requires_approval: type.requires_approval,
      max_days_per_request: type.max_days_per_request,
    })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingType) {
        await holidayTypesApi.update(editingType.id, formData)
      } else {
        await holidayTypesApi.create(formData)
      }
      await fetchTypes()
      setModalOpen(false)
    } catch (error) {
      console.error('Failed to save holiday type:', error)
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this holiday type?')) return

    try {
      await holidayTypesApi.delete(id)
      setTypes(prev => prev.filter(t => t.id !== id))
    } catch (error) {
      console.error('Failed to delete holiday type:', error)
      alert(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holiday Types</h1>
          <p className="text-gray-500">Configure different types of leave</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          Add Type
        </Button>
      </div>

      {/* Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {types.map((type) => (
          <Card key={type.id} className="hover:shadow-md transition-shadow">
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg"
                    style={{ backgroundColor: type.color }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{type.name}</h3>
                    <p className="text-sm text-gray-500">
                      Max {type.max_days_per_request} days/request
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(type)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-mint-600 hover:bg-mint-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {type.description && (
                <p className="mt-3 text-sm text-gray-600">{type.description}</p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-500">Requires Approval</span>
                <span className={`text-sm font-medium ${type.requires_approval ? 'text-yellow-600' : 'text-green-600'}`}>
                  {type.requires_approval ? 'Yes' : 'No'}
                </span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingType ? 'Edit Holiday Type' : 'Add Holiday Type'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border border-gray-300"
              />
              <span className="text-sm text-gray-500">{formData.color}</span>
            </div>
          </div>

          <Input
            label="Max Days Per Request"
            type="number"
            min="1"
            max="365"
            value={formData.max_days_per_request}
            onChange={(e) => setFormData({ ...formData, max_days_per_request: parseInt(e.target.value) })}
            required
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requires_approval"
              checked={formData.requires_approval}
              onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
              className="w-4 h-4 text-mint-600 border-gray-300 rounded focus:ring-mint-500"
            />
            <label htmlFor="requires_approval" className="text-sm text-gray-700">
              Requires manager approval
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : (editingType ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
