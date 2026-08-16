import SwiftUI

public struct BadgeView: View {
    public let title: String

    public init(title: String) {
        self.title = title
    }

    public var body: some View {
        NavigationView {
            Text(title)
                .font(.system(size: 17))
        }
    }
}
