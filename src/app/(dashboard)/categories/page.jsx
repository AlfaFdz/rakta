import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Layers, Clock } from "lucide-react";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-6 rakta-card-shadow flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-rakta-navy">Kategori Produk Pergudangan</h1>
          <p className="text-xs text-rakta-muted mt-1">Pengelompokan barang untuk mempermudah penataan inventaris rak gudang.</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-rakta-bg flex items-center justify-center text-rakta-primary">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      <Card className="text-center py-12">
        <Clock className="w-10 h-10 text-rakta-muted mx-auto mb-3" />
        <CardTitle className="text-base">Modul Pengelolaan Kategori</CardTitle>
        <CardDescription className="max-w-md mx-auto mt-1">
          Intinya deskripsi disini
        </CardDescription>
      </Card>
    </div>
  );
}