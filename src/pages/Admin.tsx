import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings, Cpu, Palette, Activity, Save } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";

const Admin = () => {
  const [aiModel, setAiModel] = useState("gpt-4");
  const [apiKey, setApiKey] = useState("");
  const [templates, setTemplates] = useState([
    { id: 1, name: "Default Blue", active: true },
    { id: 2, name: "Ocean Theme", active: false },
    { id: 3, name: "Terrain Style", active: false }
  ]);

  const handleSaveSettings = () => {
    toast.success("Settings saved successfully!");
  };

  const handleAddTemplate = () => {
    const newTemplate = {
      id: templates.length + 1,
      name: `Template ${templates.length + 1}`,
      active: false
    };
    setTemplates([...templates, newTemplate]);
    toast.success("New template added!");
  };

  const toggleTemplate = (id: number) => {
    setTemplates(templates.map(template => 
      template.id === id 
        ? { ...template, active: !template.active }
        : template
    ));
  };

  const mockStats = {
    totalMaps: 1247,
    thisMonth: 156,
    activeUsers: 89,
    avgResponseTime: "2.3s"
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage AI models, templates, and monitor system usage
          </p>
        </div>

        <Tabs defaultValue="ai-config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ai-config" className="gap-2">
              <Cpu className="h-4 w-4" />
              AI Configuration
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Palette className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <Activity className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-config">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  AI Model Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="ai-model">AI Model</Label>
                    <Select value={aiModel} onValueChange={setAiModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        <SelectItem value="claude-3">Claude 3</SelectItem>
                        <SelectItem value="mistral-large">Mistral Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your API key"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="system-prompt">System Prompt</Label>
                  <Textarea
                    id="system-prompt"
                    placeholder="Enter system prompt for the AI model..."
                    className="min-h-32"
                    defaultValue="You are an expert geospatial AI assistant that helps users create beautiful, accurate maps from natural language descriptions. Focus on interpreting geographic requirements, data analysis needs, and visual styling preferences."
                  />
                </div>

                <Button onClick={handleSaveSettings} variant="hero" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Map Templates
                  </CardTitle>
                  <Button onClick={handleAddTemplate} variant="outline">
                    Add Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="relative">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium">{template.name}</h3>
                          <Badge variant={template.active ? "default" : "secondary"}>
                            {template.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="h-24 bg-gradient-ocean rounded-md mb-3"></div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => toggleTemplate(template.id)}
                          className="w-full"
                        >
                          {template.active ? "Deactivate" : "Activate"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-primary">{mockStats.totalMaps}</div>
                  <p className="text-muted-foreground text-sm">Total Maps Generated</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-primary">{mockStats.thisMonth}</div>
                  <p className="text-muted-foreground text-sm">Maps This Month</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-primary">{mockStats.activeUsers}</div>
                  <p className="text-muted-foreground text-sm">Active Users</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-primary">{mockStats.avgResponseTime}</div>
                  <p className="text-muted-foreground text-sm">Avg Response Time</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Usage Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Analytics charts would be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="max-file-size">Max File Size (MB)</Label>
                    <Input
                      id="max-file-size"
                      type="number"
                      defaultValue="50"
                      min="1"
                      max="100"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="timeout">Request Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      defaultValue="30"
                      min="10"
                      max="120"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveSettings} variant="hero" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;