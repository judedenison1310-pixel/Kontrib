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
  const [amount, setAmount] = useState(
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
      setAmount(project.targetAmount ? String(parseFloat(project.targetAmount)) : "");
      setDeadline(project.deadline ? new Date(project.deadline).toISOString().split("T")[0] : "");
      setStatus(project.status || "active");
    }
  }, [open, project]);

  // Project type is intentionally NOT editable here. It's set at creation time
  // (target / association_dues / ajo_cycle / etc.) and changing it would put
  // the project in an inconsistent state with the rest of the app.
  const projectType = project.projectType || "target";

  const requiresTarget =
    projectType === "target" || projectType === "event" || projectType === "emergency";

  // Per-member amount types (dues / levies / ajo cycles) store the per-member
  // amount in `targetAmount`. We expose it as an editable "Dues Amount" field
  // so an admin can correct a wrong amount entered earlier.
  const isPerMemberAmount =
    projectType === "association_dues" ||
    projectType === "association_levy" ||
    projectType === "ajo_cycle";

  const showAmountField = requiresTarget || isPerMemberAmount;
  const amountLabel = isPerMemberAmount ? "Dues Amount (₦)" : "Target Amount (₦)";
  const amountHelper = isPerMemberAmount
    ? "Per-member amount each member is expected to pay."
    : null;

  const mutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        status,
      };

      if (showAmountField) {
        updates.targetAmount = amount || "0";
      } else {
        // Open-ended type with no amount: clear any stale value so progress
        // bars stop tracking it.
        updates.targetAmount = "0";
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
      // For per-member-amount projects (association dues / levies / ajo
      // cycles), the corresponding status panel reads from a separate
      // endpoint. Invalidate those so the new dues amount and the recomputed
      // expected pot reflect immediately on the dues page.
      if (isPerMemberAmount) {
        queryClient.invalidateQueries({ queryKey: ["/api/groups", project.groupId, "association"] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups", project.groupId, "ajo"] });
      }
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
    if (showAmountField) {
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        toast({
          title: isPerMemberAmount ? "Enter a valid dues amount" : "Enter a valid target amount",
          variant: "destructive",
        });
        return;
      }
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

          {showAmountField && (
            <div className="space-y-2">
              <Label htmlFor="proj-amount">{amountLabel}</Label>
              <Input
                id="proj-amount"
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={isPerMemberAmount ? "e.g. 50000" : "e.g. 500000"}
                data-testid={isPerMemberAmount ? "input-dues-amount" : "input-target-amount"}
              />
              {amountHelper && (
                <p className="text-xs text-gray-500">{amountHelper}</p>
              )}
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
