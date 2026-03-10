import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: "Enter a valid amount greater than 0",
    }),
  recipient: z.string().min(2, "Recipient name is required"),
  purpose: z.string().min(3, "Purpose is required"),
  disbursementDate: z.string().min(1, "Date is required"),
});

type FormValues = z.infer<typeof schema>;

interface AddDisbursementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  createdBy: string;
}

export function AddDisbursementModal({
  open,
  onOpenChange,
  projectId,
  createdBy,
}: AddDisbursementModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: "",
      recipient: "",
      purpose: "",
      disbursementDate: new Date().toISOString().split("T")[0],
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      form.reset();
      removeReceipt();
    }
    onOpenChange(open);
  };

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiRequest("POST", `/api/projects/${projectId}/disbursements`, {
        amount: values.amount,
        recipient: values.recipient,
        purpose: values.purpose,
        disbursementDate: values.disbursementDate,
        receipt: receiptPreview || null,
        createdBy,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/disbursements`],
      });
      toast({ title: "Disbursement recorded" });
      form.reset();
      removeReceipt();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Failed to record disbursement",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Disbursement</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₦)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient</FormLabel>
                  <FormControl>
                    <Input placeholder="Who received the funds?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What were the funds used for?"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="disbursementDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Receipt Upload */}
            <div>
              <p className="text-sm font-medium mb-2">Receipt (optional)</p>
              {receiptPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-full max-h-40 object-contain bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={removeReceipt}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="disbursement-receipt-input"
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-1 text-gray-400 hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-xs">Tap to upload receipt</span>
                  <span className="text-xs">JPG, PNG or PDF · Max 5MB</span>
                </label>
              )}
              <input
                id="disbursement-receipt-input"
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleClose(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Record
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
