import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.nextUrl.searchParams.get("apiKey");
    const whereClause = apiKey ? { sessionId: apiKey } : {};
    
    const totalRequests = await prisma.requestLog.count({ where: whereClause });
    const searchesRun = await prisma.requestLog.count({ where: { ...whereClause, searchUsed: true } });
    const lorebooksInjected = await prisma.requestLog.count({
        where: { ...whereClause, model: { lorebooks: { some: {} } } }
    });

    const logs = await prisma.requestLog.findMany({
        where: whereClause,
        select: { tokenUsageJson: true, modelId: true, executionMs: true, errorCode: true, ttftMs: true, timestamp: true },
        orderBy: { timestamp: 'desc' }
    });

    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let errorCount = 0;
    const modelBreakdown: Record<string, { requests: number, tokens: number }> = {};
    
    // Trend data: group by day
    const usageTrendMap: Record<string, number> = {};
    const ttftTrendMap: Record<string, { sum: number, count: number }> = {};

    for (const log of logs) {
        if (!modelBreakdown[log.modelId]) {
            modelBreakdown[log.modelId] = { requests: 0, tokens: 0 };
        }
        modelBreakdown[log.modelId].requests += 1;

        let usage: any = {};
        try {
            usage = typeof log.tokenUsageJson === 'string' ? JSON.parse(log.tokenUsageJson) : log.tokenUsageJson || {};
        } catch(e){}

        if (usage) {
            totalTokens += usage.totalTokens || usage.total_tokens || 0;
            promptTokens += usage.promptTokens || usage.prompt_tokens || 0;
            completionTokens += usage.completionTokens || usage.completion_tokens || 0;
            modelBreakdown[log.modelId].tokens += usage.totalTokens || usage.total_tokens || 0;
        }
        
        // Calculate avg response time
        if (log.executionMs) {
            totalResponseTime += log.executionMs;
            responseTimeCount++;
        }
        
        // Count errors
        if (log.errorCode) {
            errorCount++;
        }
        
        // Build trend data
        const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
        usageTrendMap[dateKey] = (usageTrendMap[dateKey] || 0) + 1;
        
        if (log.ttftMs) {
            if (!ttftTrendMap[dateKey]) {
                ttftTrendMap[dateKey] = { sum: 0, count: 0 };
            }
            ttftTrendMap[dateKey].sum += log.ttftMs;
            ttftTrendMap[dateKey].count += 1;
        }
    }

    const avgResponseTime = responseTimeCount > 0 ? Math.round(totalResponseTime / responseTimeCount) : 0;
    const successRate = totalRequests > 0 ? Math.round(((totalRequests - errorCount) / totalRequests) * 100) : 100;

    // Format model breakdown into array for charting
    const chartData = Object.entries(modelBreakdown)
        .map(([modelId, stats]) => ({ modelId, ...stats }))
        .sort((a, b) => b.requests - a.requests);
    
    // Format trend data (last 14 days)
    const last14Days = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (13 - i));
        return date.toISOString().split('T')[0];
    });
    
    const usageTrend = last14Days.map(date => ({
        date,
        value: usageTrendMap[date] || 0
    }));
    
    const ttftTrend = last14Days.map(date => {
        const data = ttftTrendMap[date];
        return {
            date,
            value: data ? Math.round(data.sum / data.count) : 0
        };
    });

    return NextResponse.json({
      success: true,
      data: {
          totalRequests,
          searchesRun,
          lorebooksInjected,
          totalTokens,
          promptTokens,
          completionTokens,
          chartData,
          avgResponseTime,
          successRate,
          usageTrend,
          ttftTrend
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: "INC-500", message: "Failed to fetch usage statistics" },
      { status: 500 }
    );
  }
}
