import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { User, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/user/profile');
      setUser(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 2) { // 2MB limit
      toast.error("Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      updateAvatar(base64String);
    };
    reader.readAsDataURL(file);
  };

  const updateAvatar = async (base64String) => {
    setUploading(true);
    try {
      const response = await axios.put('/api/user/profile', {
        avatar: base64String
      });
      setUser(response.data);
      // Update localStorage username if needed (though we rely on API for avatar)
      // We might want to trigger a global update or just rely on this page updating.
      // For Navbar to update, we might need a context or just force a reload, 
      // but let's stick to simple page update first.
      
      // Update local storage event to notify other components (like Navbar) if we were using it there
      // window.dispatchEvent(new Event("storage"));
      
      toast.success("Profile picture updated!");
      // Notify other components (Navbar) that profile has changed
      window.dispatchEvent(new Event("profileUpdated"));
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile picture.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <div className="text-center py-10">User not found.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">User Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-32 w-32 rounded-full overflow-hidden border-2 border-border bg-muted">
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-secondary text-secondary-foreground">
                  <User className="h-16 w-16" />
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-xl font-semibold">{user.username}</h3>
              <p className="text-sm text-muted-foreground">
                Daily Analyses: {user.daily_analysis_count}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={uploading} asChild>
                <label className="cursor-pointer flex items-center gap-2">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Uploading..." : "Change Avatar"}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
