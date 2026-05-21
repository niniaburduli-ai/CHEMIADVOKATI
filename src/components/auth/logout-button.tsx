import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut className="mr-2 h-4 w-4" />
        გასვლა
      </Button>
    </form>
  );
}
