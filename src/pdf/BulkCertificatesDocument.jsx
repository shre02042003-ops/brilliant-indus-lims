import React from "react";
import { Document } from "@react-pdf/renderer";
import CertificatePagePdf from "./CertificatePagePdf";

/** One certificate = one Document so pageNumber/totalPages stay local to that cert. */
export default function SingleCertificateDocument({ cert }) {
  return (
    <Document>
      <CertificatePagePdf cert={cert} />
    </Document>
  );
}

/** @deprecated Prefer SingleCertificateDocument for correct per-cert page counts. */
export function BulkCertificatesDocument({ certificates }) {
  return (
    <Document>
      {certificates.map((cert, index) => (
        <CertificatePagePdf
          key={cert.certificateNo || cert.ulrNo || index}
          cert={cert}
        />
      ))}
    </Document>
  );
}
