import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
  SignInResponse,
  SignInSilentlyResponse,
  User,
} from "@react-native-google-signin/google-signin";
import { useEffect, useState } from "react";
import { StyleSheet, Button, View, Alert, Text } from "react-native";
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { FlatList } from 'react-native';
import { fetchDriveFiles, postDriveFile } from '@/components/Method'; 

export default function Login() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "15098007124-2g536k63gra5n75erfkcpq8355bha3kj.apps.googleusercontent.com",
      scopes: [
        "https://www.googleapis.com/auth/drive.file", 
        "https://www.googleapis.com/auth/drive.readonly",
      ]
    });

    GoogleSignin.signInSilently()
      .then(async (res: SignInSilentlyResponse) => {
        if (res.type === "success") {
          setUser(res.data);
          const tokens = await GoogleSignin.getTokens();
          setAccessToken(tokens.accessToken);
          fetchDriveFiles(tokens.accessToken, setDriveFiles); // <-- Fetch files when signed in
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timer;

    if (accessToken) {
      fetchDriveFiles(accessToken, setDriveFiles); // initial fetch
      interval = setInterval(() => {
        fetchDriveFiles(accessToken, setDriveFiles);
      }, 10000); // every 10s
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [accessToken]);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const res: SignInResponse = await GoogleSignin.signIn();
      if (res.type === "success") {
        setUser(res.data);
        const tokens = await GoogleSignin.getTokens();
        setAccessToken(tokens.accessToken);
        fetchDriveFiles(tokens.accessToken, setDriveFiles); // <-- Fetch files after signing in
      } else if (res.type === "cancelled") {
        Alert.alert("Login cancelled");
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        Alert.alert("Login error", error.message);
      } else {
        Alert.alert("Unknown error");
      }
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      setUser(null);
    } catch {
      Alert.alert("Sign out failed");
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}>
      <View style={styles.container}>
        {user ? (
          <>
            <Text style={styles.greeting}>👋 Welcome, {user.user.name}</Text>
            <Button title="Sign out" onPress={signOut} />
            <Text style={styles.subHeader}>📂 Your Drive Files:</Text>
            <FlatList
              scrollEnabled={false}
              data={driveFiles}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.fileList}
              renderItem={({ item }) => (
                <Text style={styles.fileItem}>• {item.name}</Text>
              )}
            />
            <Button title="Upload photo to Drive" onPress={() => postDriveFile(accessToken!, fetchDriveFiles, setDriveFiles)} />
          </>
        ) : (
          <Button title="Sign in with Google" onPress={signIn} />
        )}
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  container: {
    alignItems: 'center',
    padding: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 20,
    marginBottom: 10,
  },
  fileList: {
    width: '100%',
    paddingHorizontal: 10,
  },
  fileItem: {
    fontSize: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
});
