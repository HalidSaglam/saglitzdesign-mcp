import SwiftUI

// SaglitzInvoiceSkeleton — the real layout, redacted. No pulse.

struct SaglitzInvoiceSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Open invoices")
                .font(.headline)
            ForEach(0..<3, id: \.self) { _ in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("INV-0000")
                        Text("Due")
                            .font(.footnote)
                    }
                    Spacer()
                    Text("$000.00")
                        .font(.body.monospacedDigit())
                }
                .frame(minHeight: 44)
            }
        }
        .redacted(reason: .placeholder)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading invoices")
        .accessibilityAddTraits(.updatesFrequently)
    }
}

#Preview { SaglitzInvoiceSkeleton().padding() }
