import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Trash2, Edit, Plus } from 'lucide-react';

interface EPCI {
  id: string;
  name: string;
  code: string;
  description?: string;
  geojson_data?: any;
  geojson_url?: string;
  population?: number;
  area_km2?: number;
  is_active: boolean;
  created_at: string;
}

export default function EPCIManager() {
  const [epcis, setEpcis] = useState<EPCI[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    geojson_data: '',
    geojson_url: '',
    population: '',
    area_km2: '',
    is_active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEPCIs();
  }, []);

  const fetchEPCIs = async () => {
    try {
      const { data, error } = await supabase
        .from('epci')
        .select('*')
        .order('name');

      if (error) throw error;
      setEpcis(data || []);
    } catch (error) {
      console.error('Error fetching EPCIs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch EPCI data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      geojson_data: '',
      geojson_url: '',
      population: '',
      area_km2: '',
      is_active: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate that either geojson_data or geojson_url is provided
      if (!formData.geojson_data && !formData.geojson_url) {
        throw new Error('Either GeoJSON data or GeoJSON URL must be provided');
      }

      // Parse GeoJSON data if provided
      let geojsonData = null;
      if (formData.geojson_data) {
        try {
          geojsonData = JSON.parse(formData.geojson_data);
        } catch (err) {
          throw new Error('Invalid GeoJSON format');
        }
      }

      const epciData = {
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
        geojson_data: geojsonData,
        geojson_url: formData.geojson_url || null,
        population: formData.population ? parseInt(formData.population) : null,
        area_km2: formData.area_km2 ? parseFloat(formData.area_km2) : null,
        is_active: formData.is_active
      };

      if (editingId) {
        const { error } = await supabase
          .from('epci')
          .update(epciData)
          .eq('id', editingId);

        if (error) throw error;
        toast({
          title: "Success",
          description: "EPCI updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('epci')
          .insert([epciData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "EPCI created successfully",
        });
      }

      resetForm();
      fetchEPCIs();
    } catch (error: any) {
      console.error('Error saving EPCI:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save EPCI",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (epci: EPCI) => {
    setFormData({
      name: epci.name,
      code: epci.code,
      description: epci.description || '',
      geojson_data: epci.geojson_data ? JSON.stringify(epci.geojson_data, null, 2) : '',
      geojson_url: epci.geojson_url || '',
      population: epci.population?.toString() || '',
      area_km2: epci.area_km2?.toString() || '',
      is_active: epci.is_active
    });
    setEditingId(epci.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this EPCI?')) return;

    try {
      const { error } = await supabase
        .from('epci')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "EPCI deleted successfully",
      });
      fetchEPCIs();
    } catch (error: any) {
      console.error('Error deleting EPCI:', error);
      toast({
        title: "Error",
        description: "Failed to delete EPCI",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('epci')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `EPCI ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      fetchEPCIs();
    } catch (error: any) {
      console.error('Error updating EPCI status:', error);
      toast({
        title: "Error",
        description: "Failed to update EPCI status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading EPCIs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">EPCI Management</h2>
        <Button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add EPCI
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit EPCI' : 'Add New EPCI'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="population">Population</Label>
                  <Input
                    id="population"
                    type="number"
                    value={formData.population}
                    onChange={(e) => setFormData({ ...formData, population: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="area_km2">Area (km²)</Label>
                  <Input
                    id="area_km2"
                    type="number"
                    step="0.01"
                    value={formData.area_km2}
                    onChange={(e) => setFormData({ ...formData, area_km2: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="geojson_url">GeoJSON URL</Label>
                <Input
                  id="geojson_url"
                  value={formData.geojson_url}
                  onChange={(e) => setFormData({ ...formData, geojson_url: e.target.value })}
                  placeholder="https://example.com/data.geojson or /data/file.geojson"
                />
              </div>

              <div>
                <Label htmlFor="geojson_data">GeoJSON Data (alternative to URL)</Label>
                <Textarea
                  id="geojson_data"
                  value={formData.geojson_data}
                  onChange={(e) => setFormData({ ...formData, geojson_data: e.target.value })}
                  placeholder="Paste GeoJSON data here..."
                  rows={6}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingId ? 'Update' : 'Create'} EPCI
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {epcis.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No EPCIs found. Create your first EPCI to get started.</p>
            </CardContent>
          </Card>
        ) : (
          epcis.map((epci) => (
            <Card key={epci.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {epci.name}
                      <Badge variant={epci.is_active ? "default" : "secondary"}>
                        {epci.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Code: {epci.code}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(epci.id, epci.is_active)}
                    >
                      {epci.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(epci)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(epci.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {epci.description && (
                  <p className="text-sm mb-2">{epci.description}</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {epci.population && (
                    <div>
                      <span className="font-medium">Population:</span> {epci.population.toLocaleString()}
                    </div>
                  )}
                  {epci.area_km2 && (
                    <div>
                      <span className="font-medium">Area:</span> {epci.area_km2} km²
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Data Source:</span> {epci.geojson_url ? 'URL' : 'Direct'}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {new Date(epci.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}