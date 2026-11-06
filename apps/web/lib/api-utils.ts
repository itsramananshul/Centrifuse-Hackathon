import { NextResponse } from "next/server";
import type { ApiResponse } from "@trialpulse/types";

export function successResponse<T>(
  data: T,
  message = "Success",
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function errorResponse(
  message: string,
  status = 500
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    { success: false, message, data: null },
    { status }
  );
}
