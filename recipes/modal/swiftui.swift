import SwiftUI

// SaglitzModal — confirmation sheet that traps attention, offers one primary
// action, and respects Reduce Motion. Use `.sheet` for non-destructive work
// and a confirmation dialog for destructive choices (no backdrop-dismiss).

struct SaglitzModal<Content: View>: View {
    let title: String
    let isPresented: Binding<Bool>
    var dismissOnBackdrop: Bool = true
    @ViewBuilder var content: () -> Content
    var primaryTitle: String
    var primaryRole: ButtonRole? = nil
    var primaryAction: () -> Void
    var secondaryTitle: String = "Cancel"

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        EmptyView()
            .sheet(isPresented: isPresented) {
                NavigationStack {
                    VStack(alignment: .leading, spacing: 16) {
                        content()
                        Spacer(minLength: 0)
                        HStack(spacing: 12) {
                            Button(secondaryTitle) { isPresented.wrappedValue = false }
                                .frame(minHeight: 44)
                            Button(primaryTitle, role: primaryRole, action: {
                                primaryAction()
                                isPresented.wrappedValue = false
                            })
                            .buttonStyle(.borderedProminent)
                            .frame(maxWidth: .infinity, minHeight: 44)
                        }
                    }
                    .padding(20)
                    .navigationTitle(title)
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Close", systemImage: "xmark") {
                                isPresented.wrappedValue = false
                            }
                            .accessibilityLabel("Close")
                        }
                    }
                }
                .presentationDetents([.medium, .large])
                .interactiveDismissDisabled(!dismissOnBackdrop)
                .animation(reduceMotion ? nil : .easeOut(duration: 0.22), value: isPresented.wrappedValue)
            }
    }
}

#Preview {
    SaglitzModal(
        title: "Delete project",
        isPresented: .constant(true),
        dismissOnBackdrop: false,
        content: { Text("This cannot be undone. The files stay on disk until you empty Recently Deleted.") },
        primaryTitle: "Delete project",
        primaryRole: .destructive,
        primaryAction: {}
    )
}
