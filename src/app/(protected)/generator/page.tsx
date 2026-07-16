"use client";

import { PasswordGenerator } from "@/components/password-generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/provider";

export default function GeneratorPage() {
  const t = useT();

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("generator.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("generator.subtitle")}</p>
        </CardHeader>
        <CardContent>
          <PasswordGenerator />
        </CardContent>
      </Card>
    </div>
  );
}
