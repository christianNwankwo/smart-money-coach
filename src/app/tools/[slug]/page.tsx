import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tools, getTool, relatedTools, categories } from "@/registry";
import { getToolComponent } from "@/tool-components";
import ToolPage from "@/components/ToolPage";

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  const category = categories.find((c) => c.id === tool.category);
  return {
    title: tool.title,
    description: tool.blurb,
    openGraph: {
      title: `${tool.title} · Smart Money Coach`,
      description: tool.blurb,
    },
  };
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ToolRoute({ params }: Props) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const ToolComponent = getToolComponent(slug);
  if (!ToolComponent) notFound();

  const category = categories.find((c) => c.id === tool.category)!;
  const related = relatedTools(slug);

  return (
    <ToolPage
      tool={tool}
      category={category}
      related={related}
      toolComponent={ToolComponent}
    />
  );
}
