import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthCard = ({
  title,
  description,
  children,
  footer,
}: AuthCardProps) => (
  <Card className="w-full max-w-sm">
    <CardHeader className="text-center">
      <CardTitle className="text-xl">{title}</CardTitle>
      {description ? <CardDescription>{description}</CardDescription> : null}
    </CardHeader>
    <CardContent>{children}</CardContent>
    {footer ? (
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {footer}
      </CardFooter>
    ) : null}
  </Card>
);
