"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DaumPostcode from "react-daum-postcode";

interface AddressSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
}

export function AddressSearchDialog({
  isOpen,
  onClose,
  onSelect,
}: AddressSearchDialogProps) {
  const handleComplete = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = "";

    if (data.addressType === "R") {
      if (data.bname !== "") {
        extraAddress += data.bname;
      }
      if (data.buildingName !== "") {
        extraAddress +=
          extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
    }

    onSelect(fullAddress);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>주소 검색</DialogTitle>
        </DialogHeader>
        <div className="h-[400px]">
          <DaumPostcode
            onComplete={handleComplete}
            style={{ height: "100%" }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
