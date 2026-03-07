import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project } from "@shared/schema";

interface EditProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

export function EditProjectModal({ open, onOpenChange, project }: EditProjectModalProps) {
  const { toast } = useToast();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [targetAmount, setTargetAmount] = useState(
    project.targetAmount ? String(parseFloat(project.targetAmount)) : ""
  );
  const [deadline, setDeadline] = useState(
    project.deadline ? new Date(project.deadline).toISOString().split("T")[0] : ""
  );
  const [status, setStatus] = useState(project.status || "active");

  useEffect(() => {
    if (open) {
      setName(project.name);
      setDescription(project.description || "");
      setTargetAmount(project.targetAmount ? String(parseFloat(project.targetAmount)) : "");
      setDeadline(project.deadline ? new Date(project.deadline).toISOString().split("T")[0] : "");
      setStatus(project.status || "active");
    }
  }, [open, project]);

  const hasTarget = project.projectType === "target";

  const mutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        status,
      };

      if (hasTarget && targetAmount) {
        updates.targetAmount = targetAmount;
      }

      if (deadline) {
        updates.deadline = new Date(deadline).toISOString();
      } else {
        updates.deadline = null;
      }

      return apiRequest("PATCH", `/api/projects/${project.id}`, updates);
    },
    onSuccess: () => {
      toast({ title: "Project updated", description: "Changes saved successfully." });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", project.groupId, "projects"] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${project.groupId}`] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Update failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Project name is required", variant: "destructive" });
      return;
    }
    if (hasTarget && targetAmount && isNaN(parseFloat(targetAmount))) {
      toast({ title: "Enter a valid target amount", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="proj-name">Project Name</Label>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              data-testid="input-project-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              data-testid="input-project-description"
            />
          </div>

          {hasTarget && (
            <div className="space-y-2">
              <Label htmlFor="proj-target">Target Amount (₦)</Label>
              <Input
                id="proj-target"
                type="number"
                min="0"
                step="any"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="e.g. 500000"
                data-testid="input-target-amount"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="proj-deadline">Due Date</Label>
            <Input
              id="proj-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              data-testid="input-deadline"
            />
            {deadline && (
              <button
                type="button"
                className="text-xs text-red-500 hover:underline"
                onClick={() => setDeadline("")}
              >
                Remove due date
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="proj-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="proj-status" data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-edit-project"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={mutation.isPending}
              data-testid="button-save-project"
            >
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
