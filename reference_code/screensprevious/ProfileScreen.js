import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../_contexts/AuthContext";

const { width } = Dimensions.get("window");

const ProfileTabScreen = () => {
  const { user, logout, siteUrl } = useAuth();
  const router = useRouter();


  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: logout, style: "destructive" },
    ]);
  };

  const handleSettingPress = (setting) => {
    Alert.alert("Settings", `${setting} feature coming soon`);
  };

  const ProfileItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
  }) => (
    <TouchableOpacity
      style={styles.profileItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.profileItemIcon}>
        <Ionicons name={icon} size={24} color="#667eea" />
      </View>
      <View style={styles.profileItemContent}>
        <Text style={styles.profileItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.profileItemSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && (
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileHeader}
      >
        <View style={styles.profileHeaderContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.userName}>
            {user?.full_name || user?.name || "User"}
          </Text>
          <Text style={styles.userEmail}>
            {user?.email || "No email available"}
          </Text>

          <View style={styles.connectionStatus}>
            <Ionicons name="checkmark-circle" size={16} color="#00D68F" />
            <Text style={styles.connectionText}>Connected</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <ProfileItem
          icon="person-outline"
          title="Profile Details"
          subtitle="View your complete employee information"
          onPress={() => router.push("/(screens)/ProfileDetailsScreen")}
        />

        <ProfileItem
          icon="shield-checkmark-outline"
          title="Privacy & Security"
          subtitle="Manage your privacy settings"
          onPress={() => handleSettingPress("Privacy & Security")}
        />

        <ProfileItem
          icon="notifications-outline"
          title="Notifications"
          subtitle="Configure push notifications"
          onPress={() => handleSettingPress("Notifications")}
        />
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>

        <ProfileItem
          icon="color-palette-outline"
          title="Theme"
          subtitle="Light mode"
          onPress={() => handleSettingPress("Theme")}
        />

        <ProfileItem
          icon="language-outline"
          title="Language"
          subtitle="English"
          onPress={() => handleSettingPress("Language")}
        />

        <ProfileItem
          icon="download-outline"
          title="Offline Data"
          subtitle="Sync and storage settings"
          onPress={() => handleSettingPress("Offline Data")}
        />
      </View>

      {/* Connection Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection</Text>

        {/* <ProfileItem
          icon="globe-outline"
          title="Frappe Site"
          subtitle={
            siteUrl
              ? siteUrl.replace("https://", "").replace("http://", "")
              : "Not Connected"
          }
          onPress={() => Alert.alert("Frappe Site", BASE_URI)}
          showArrow={false}
        /> */}

        <ProfileItem
          icon="globe-outline"
          title="Frappe Site"
          subtitle={
            siteUrl
              ? siteUrl.replace("https://", "").replace("http://", "")
              : "Not Connected"
          }
          onPress={() => Alert.alert("Frappe Site", siteUrl || "Not Connected")}
          showArrow={false}
        />

        <ProfileItem
          icon="sync-outline"
          title="Last Sync"
          subtitle="Just now"
          onPress={() => handleSettingPress("Sync Status")}
          showArrow={false}
        />
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        <ProfileItem
          icon="help-circle-outline"
          title="Help & Support"
          subtitle="Get help and contact support"
          onPress={() => handleSettingPress("Help & Support")}
        />

        <ProfileItem
          icon="information-circle-outline"
          title="About"
          subtitle="App version 1.0.0"
          onPress={() => handleSettingPress("About")}
        />
      </View>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={24} color="#FF3D71" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  profileHeader: {
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: "center",
  },
  profileHeaderContent: {
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  userName: {
    fontSize: width > 768 ? 26 : 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: width > 768 ? 18 : 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 12,
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  connectionText: {
    color: "#FFFFFF",
    fontSize: width > 768 ? 16 : 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: width > 768 ? 20 : 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  profileItem: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    padding: width > 768 ? 20 : 16,
    marginBottom: 2,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileItemContent: {
    flex: 1,
  },
  profileItemTitle: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  profileItemSubtitle: {
    fontSize: width > 768 ? 16 : 14,
    color: "#6B7280",
  },
  logoutContainer: {
    paddingHorizontal: 16,
    marginTop: 32,
  },
  logoutButton: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: width > 768 ? 20 : 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: "600",
    color: "#FF3D71",
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 32,
  },
});

export default ProfileTabScreen;
