import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Lorebook import endpoint
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json(
        { error: "INC-402", message: "No data provided" },
        { status: 400 }
      );
    }

    // Normalize different lorebook formats
    let lorebookName = data.name || data.title || "Imported Lorebook";
    let entries = data.entries || data.items || [];

    // Handle SillyTavern format
    if (data.entries && Array.isArray(data.entries)) {
      entries = data.entries;
    }

    // Handle Agnai format
    if (data.kind === "memory" && data.entries) {
      entries = data.entries;
    }

    // Validate entries
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "INC-402", message: "No valid entries found in lorebook data" },
        { status: 400 }
      );
    }

    // Create lorebook
    const lorebook = await prisma.lorebook.create({
      data: {
        name: lorebookName,
        isGlobal: false,
      },
    });

    // Create entries
    const createdEntries = [];
    for (const entry of entries) {
      try {
        // Normalize entry fields from different formats
        const title = entry.name || entry.title || entry.key || "Untitled Entry";
        const keys = entry.keys || entry.triggers || entry.keywords || [entry.key].filter(Boolean);
        const content = entry.content || entry.text || entry.value || "";
        const summary = entry.comment || entry.summary || null;
        
        // Determine trigger type
        let triggerType = "keyword";
        if (entry.case_sensitive || entry.exact) triggerType = "exact";
        if (entry.regex) triggerType = "regex";

        const createdEntry = await prisma.lorebookEntry.create({
          data: {
            lorebookId: lorebook.id,
            title,
            keys: Array.isArray(keys) ? keys : [keys],
            triggerType,
            content,
            summary,
            metadataJson: {
              source: entry.source || null,
              universe: entry.universe || entry.world || null,
              tags: entry.tags || [],
            },
            priority: entry.priority || entry.order || 0,
            isPinned: entry.constant || entry.pinned || false,
          },
        });

        createdEntries.push(createdEntry);
      } catch (entryError) {
        // Continue with other entries
      }
    }

    return NextResponse.json({
      success: true,
      lorebook: {
        id: lorebook.id,
        name: lorebook.name,
      entriesImported: createdEntries.length,
    },
  });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INC-402", message: error.message || "Failed to import lorebook" },
      { status: 500 }
    );
  }
}
