import Seo from "@/components/Seo";
import Container from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <Seo
        title="Page not found"
        description="This page doesn't exist."
        path="/404"
      />
      <Container className="flex min-h-[80svh] flex-col items-start justify-center py-32">
        <h1 className="font-display text-h1 text-ink">Page not found.</h1>
        <p className="mt-5 max-w-measure text-body text-slate">
          The page you're looking for doesn't exist, or has moved.
        </p>
        <div className="mt-9">
          <Button to="/">Back to home</Button>
        </div>
      </Container>
    </>
  );
}
