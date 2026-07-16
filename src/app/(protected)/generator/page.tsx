import { PasswordGenerator } from "@/components/password-generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GeneratorPage() {
  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>密码生成器</CardTitle>
          <p className="text-sm text-muted-foreground">
            独立使用密码生成功能，也可在创建条目时快捷调用
          </p>
        </CardHeader>
        <CardContent>
          <PasswordGenerator />
        </CardContent>
      </Card>
    </div>
  );
}
