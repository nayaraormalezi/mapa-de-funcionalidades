import { compareChannels } from "@/services/transformation";
import { getAdvancedComparison } from "@/services/intelligence";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const a = searchParams.get("a");
  const b = searchParams.get("b");

  if (!a || !b) {
    return NextResponse.json(
      { error: "Parâmetros a e b são obrigatórios." },
      { status: 400 },
    );
  }

  const [comparison, advanced] = await Promise.all([
    compareChannels(a, b),
    getAdvancedComparison(a, b),
  ]);

  return NextResponse.json({ comparison, advanced });
}
