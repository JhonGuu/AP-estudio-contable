import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { authStorage } from "@/lib/auth-storage";

const loginSchema = z.object({
  email: z.string().email("Ingresa un email valido"),
  password: z.string().min(1, "Ingresa tu contrasena"),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  usuario: { id: string; nombre: string; apellido: string };
}

export function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const loginMutation = useMutation({
    mutationFn: (input: LoginForm) => apiFetch<LoginResponse>("/auth/login", { method: "POST", body: input }),
    onSuccess: (data) => {
      authStorage.setSession(data.accessToken, data.refreshToken);
      void navigate({ to: "/" });
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold">AP-Contadores</h1>
        <p className="mb-6 text-sm text-slate-500">Iniciar sesion en tu estudio</p>

        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => loginMutation.mutate(values))}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" {...register("email")} />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contrasena</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {loginMutation.isError && (
            <p className="text-sm text-red-600">{(loginMutation.error as Error).message}</p>
          )}

          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
