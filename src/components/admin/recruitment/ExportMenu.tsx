import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { exportData, ExportFormat } from "./exportData";

interface Props {
  filename: string;
  columns: { key: string; label: string }[];
  rows: any[];
  label?: string;
}

export default function ExportMenu({ filename, columns, rows, label = "Export" }: Props) {
  const run = (f: ExportFormat) => exportData(f, filename, columns, rows);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" />{label}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run("csv")}>CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("pdf")}>PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
