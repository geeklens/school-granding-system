"use client"

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "@/lib/hooks";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
  const { login, currentUser } = useAppStore();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, router]);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error(t('auth.error'));
      return;
    }

    setIsLoading(true);
    try {
      // If user enters just 'username', convert it to 'username@f.com'
      const loginIdentity = email.includes("@") ? email : `${email}@f.com`;

      const success = await login(loginIdentity, password);
      if (success) {
        toast.success(t('auth.signIn'));
        router.push("/dashboard");
      } else {
        toast.error(t('auth.error'));
      }
    } catch (error) {
      toast.error(t('auth.error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-[380px] border-border shadow-2xl bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">GradeSystem</CardTitle>
          <CardDescription>{t('auth.login')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="text"
                placeholder="login"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="*******"
                className="pl-9 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <Button
            className="w-full mt-4"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? t('common.loading') : t('auth.signIn')}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
