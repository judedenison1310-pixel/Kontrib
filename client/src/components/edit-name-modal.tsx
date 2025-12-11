import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { updateProfile, getCurrentUser, setCurrentUser } from "@/lib/auth";

interface EditNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "group" | "project" | "profile";
  currentName: string;
  entityId?: string;
  groupId?: string;
}

export function EditNameModal({
  open,
  onOpenChange,
  type,
  currentName,
  entityId,
  groupId,
}: EditNameModalProps) {
  const [name, setName] = useState(currentName);
  const { toast } = useToast();
  const user = getCurrentUser();

  const mutation = useMutation({
    mutationFn: async (newName: string) => {
      if (type === "group" && entityId) {
        return apiRequest("PATCH", `/api/groups/${entityId}`, {
          name: newName,
          adminId: user?.id,
        });
      } else if (type === "project" && entityId) {
        return apiRequest("PATCH", `/api/projects/${entityId}`, {
          name: newName,
        });
      } else if (type === "profile" && user) {
        const updatedUser = await updateProfile(user.id, { fullName: newName });
        setCurrentUser(updatedUser);
        return updatedUser;
      }
      throw new Error("Invalid edit type");
    },
    onSuccess: () => {
      toast({
        title: "Updated Successfully",
        description: `${type === "profile" ? "Your name" : type === "group" ? "Group name" : "Project name"} has been updated.`,
      });
      
      if (type === "group" && entityId) {
        queryClient.invalidateQueries({ queryKey: ["/api/groups", entityId] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups/all"] });
      } else if (type === "project" && entityId) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", entityId] });
        if (groupId) {
          queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "projects"] });
        }
      }
      
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast({
        title: "Invalid Name",
        description: "Name must be at least 2 characters",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(name.trim());
  };

  const getTitle = () => {
    switch (type) {
      case "group": return "Edit Group Name";
      case "project": return "Edit Project Name";
      case "profile": return "Edit Your Name";
      default: return "Edit Name";
    }
  };

  const getLabel = () => {
    switch (type) {
      case "group": return "Group Name";
      case "project": return "Project Name";
      case "profile": return "Your Name";
      default: return "Name";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{getLabel()}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${getLabel().toLowerCase()}`}
              data-testid="input-edit-name"
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={mutation.isPending || name.trim() === currentName}
              data-testid="button-save-name"
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
