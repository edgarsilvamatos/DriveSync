import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
  SignInResponse,
  SignInSilentlyResponse,
  User,
} from "@react-native-google-signin/google-signin";
import { useEffect, useState } from "react";
import { StyleSheet, Button, View, Alert, Text, TouchableOpacity } from "react-native";
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { FlatList } from 'react-native';
import { fetchDriveFiles, postDriveFile } from '@/components/Method'; 
import { useUploadRetry } from '@/components/UseUploadReload';
import { triggerBannerNotification } from '@/components/Notifications';

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
          fetchDriveFiles(tokens.accessToken, setDriveFiles);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timer;

    if (accessToken) {
      fetchDriveFiles(accessToken, setDriveFiles); 
      interval = setInterval(() => {
        fetchDriveFiles(accessToken, setDriveFiles);
      }, 10000); // every 10s
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [accessToken]);

  useUploadRetry(accessToken, fetchDriveFiles, setDriveFiles, triggerBannerNotification);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const res: SignInResponse = await GoogleSignin.signIn();
      if (res.type === "success") {
        setUser(res.data);
        const tokens = await GoogleSignin.getTokens();
        setAccessToken(tokens.accessToken);
        fetchDriveFiles(tokens.accessToken, setDriveFiles); 
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
    <ParallaxScrollView>
      <View style={styles.container}>
        {user ? (
          <>
            <Text style={styles.greeting}>👋 Welcome, {user.user.name}</Text>
            <TouchableOpacity style={styles.button} onPress={signOut}>
              <Text style={styles.buttonText}>Sign out</Text>
            </TouchableOpacity>

            <Text style={styles.subHeader}>📂 Your Drive Files:</Text>
            <View style={styles.fileContainer}>
              <FlatList
                scrollEnabled={false}
                data={driveFiles}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.fileList}
                renderItem={({ item }) => (
                  <Text style={styles.fileItem}>• {item.name}</Text>
                )}
              />
            </View>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => postDriveFile(accessToken!, fetchDriveFiles, setDriveFiles)}
            >
              <Text style={styles.buttonText}>Upload photo to Drive</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.welcomeText}>Welcome to DriveSync</Text>
            <Text style={styles.loginPrompt}>Please log in to your Google account</Text>
            <TouchableOpacity style={styles.button} onPress={signIn}>
              <Text style={styles.buttonText}>Sign in with Google</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  loginPrompt: {
    fontSize: 18,
    fontWeight: '500',
    color: '#777',
    marginBottom: 30,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginVertical: 10,
  },
  uploadButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginVertical: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
  },
  fileContainer: {
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  fileList: {
    paddingVertical: 10,
  },
  fileItem: {
    fontSize: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
});
