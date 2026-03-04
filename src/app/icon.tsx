import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #DDE8E0 0%, #E0E0E0 100%)",
          color: "#357A50",
          fontSize: 180,
          fontWeight: 700,
          borderRadius: 96,
        }}
      >
        L
      </div>
    ),
    size,
  );
}
