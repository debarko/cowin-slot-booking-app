import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  Keyboard,
  Button,
  Alert,
  PermissionsAndroid,
  Modal,
  Pressable,
  useColorScheme,
  View,
  TextInput,
  ColorPropType,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import KeepAwake from 'react-native-keep-awake';
import SmsListener from 'react-native-android-sms-listener';
import Markdown from 'react-native-markdown-display';
import RadioButton from './components/RadioButton';
import SoundPlayer from 'react-native-sound-player';
import randomUseragent from 'random-useragent';
import SHA256 from './vendor/sha256';

//TODO
// Generate all the filter values
// Error Messages
// Background Task
// Read SMS
// Kill app if permissions not given with alert
// Print out value from API calls into view from BT
// Generate Local Notif when needed
// Take Permissions Popup


const App = () => {
  const [pincodes, setPincodes] = React.useState('560076');
  const [mobile, setMobile] = React.useState('9686085068');
  const [dateSelect, setDate] = React.useState(new Date());
  const [noOfDays, setNoOfDays] = React.useState('1');
  const [selectBeneficiary, setSelectBeneficiary] = React.useState();
  const [selectedAge, setSelectedAge] = React.useState();
  const [selectedVaccine, setSelectedVaccine] = React.useState();
  const [selectedDose, setSelectedDose] = React.useState();
  const [beneficiaryModalVisible, setBeneficiaryModalVisible] = React.useState(false);
  const [copy, setCopy] = React.useState('');
  const [beneficiariesList, setBeneficiariesList] = React.useState([]);
  const [ageList, setAgeList] = React.useState([
    {text: '18+', key: '18'},
    {text: '45+', key: '45'}
  ]);
  const [vaccineList, setVaccineList] = React.useState([
    {text: 'Covaxin', key: 'COVAXIN'},
    {text: 'Covisheild', key: 'COVISHIELD'}
  ]);
  const [doseList, setDoseList] = React.useState([
    {text: 'Dose 1', key: '1'},
    {text: 'Dose 2', key: '2'}
  ]);
  
  const onChangePincodes = (enteredPincodes) => {
    setPincodes(enteredPincodes);
  }

  const onChangeMobile = (enteredMobile) => {
    setMobile(enteredMobile);
  }

  const onChangeDateSelect = (enteredDateSelect) => {
    setDate(enteredDateSelect);
  }

  const onChangeNoOfDays = (enteredNoOfDays) => {
    setNoOfDays(enteredNoOfDays);
  }

  const onSelect = (item) => {
    if (selectBeneficiary && selectBeneficiary.key === item.key) {
      setSelectBeneficiary(null);
    } else {
      setSelectBeneficiary(item);
    }
  };

  const onSelectAge = (item) => {
    if (selectedAge && selectedAge.key === item.key) {
      setSelectedAge(null);
    } else {
      setSelectedAge(item);
    }
  };

  const onSelectVaccine = (item) => {
    if (selectedVaccine && selectedVaccine.key === item.key) {
      setSelectedVaccine(null);
    } else {
      setSelectedVaccine(item);
    }
  };

  const onSelectDose = (item) => {
    if (selectedDose && selectedDose.key === item.key) {
      setSelectedDose(null);
    } else {
      setSelectedDose(item);
    }
  };

  // Config
  const base_url = 'https://cdn-api.co-vin.in/api';
  const public_mode = 0;
  const debug = 1;

  // DO NOT Touch
  let token = '';
  let globalResponseArray = [];
  let apptFilters = {
    min_age: 18,
    pincodes: [], //"562122", "561203", "562164"
    dateRange: [], //"08-05-2021", "09-05-2021", "10-05-2021"
    cycleCounter: 0
  }
  let markdownCopy = '** Results will show above **'
  let userAgent = randomUseragent.getRandom();
  let cowinKey = "CoWIN@$#&*(!@%^&";
  let secretString = "b5cab167-7977-4df1-8027-a63aa144f04e";
  let encryptedAESString = 'U2FsdGVkX18fw2lNFFUS1gP60I5JVcMcnI81zqxA6tNp6PyontdyEqJwh0AXw9UtoHUga/np2dTNYXIsmXliYQ==';


  // UTIL Functions
  let prependCopy = (text) => {
    markdownCopy = text + '\n' + markdownCopy
    setCopy(markdownCopy);
  };

  let play_alarm = () => {
    try {
      SoundPlayer.playSoundFile('alarm', 'wav');
    } catch (e) {
      if (debug) console.log("can't play sound");
    }
  }

  let filter_array = (test_array) => {
      let index = -1;
      const arr_length = test_array ? test_array.length : 0;
      let resIndex = -1;
      const result = [];

      while (++index < arr_length) {
          const value = test_array[index];

          if (value) {
              result[++resIndex] = value;
          }
      }

      return result;
  };

  async function requestReadSmsPermission() {
    try {
      var granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
        title: "Auto Verification OTP",
        message: "need access to read sms, to verify OTP"
      });
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        if (debug) console.log("sms read permissions granted", granted); 
        granted = await PermissionsAndroid.request( 
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,{ 
          title: "Receive SMS",
          message: "Need access to receive sms, to verify OTP"
        });
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          if (debug) console.log("RECEIVE_SMS permissions granted", granted);
        } else {
          if (debug) console.log("RECEIVE_SMS permissions denied");
        }
      } else {
        if (debug) console.log("sms read permissions denied");
      }
    } catch (err) {
      if (debug) console.log(err);
    }
  }

  let sleepNow = (timeInSeconds) => {
    console.log(`Sleeping for ${timeInSeconds} seconds.`);
    return new Promise((resolve) => setTimeout(resolve, timeInSeconds * 1000));
  };

  let convertDate = (d) => {
    function pad(s) { return (s < 10) ? '0' + s : s; }
    return [pad(d.getDate()), pad(d.getMonth()+1), d.getFullYear()].join('-')
  };

  let checkError = (response) => {
    if (response.ok) {
      return response.json();
    } else {
      throw Error(response.statusText);
    }
  };

  let expandArr = (val, arr) => {
    arr.forEach(
      (item, index, inputArr) => inputArr[index] = {
        pincode: val,
        dateSelect: item
      }
    )
    return arr;
  };

  let createURL = (path) => {
    const url = base_url.concat(path);
    if (debug) console.log(userAgent + ' <--> ' + url);
    return url;
  };

  let generateOTP = (number) => {
    const urlGenerateOTP = createURL('/v2/auth/generateMobileOTP')

    let promiseTxnId = fetch(urlGenerateOTP, {
      "headers": {
        "authority": "cdn-api.co-vin.in",
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        "pragma": "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-gpc": "1",
        "user-agent": userAgent
      },
      "referrer": "https://selfregistration.cowin.gov.in/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": "{\"secret\": " + encryptedAESString + ", \"mobile\":" + number + "}",
      "method": "POST",
      "mode": "cors"
    });

    return promiseTxnId;
  };

  let confirmOTP = (txnId, otpValue) => {
    let promiseToken = fetch(createURL("/v2/auth/validateMobileOtp"), {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        "pragma": "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-gpc": "1",
        "user-agent": userAgent
      },
      "referrer": "https://selfregistration.cowin.gov.in/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": "{\"otp\":\"" + SHA256(otpValue) + "\",\"txnId\":\"" + txnId + "\"}",
      "method": "POST",
      "mode": "cors"
    });

    return promiseToken;
  };

  let beneficiariesHandling = () => {
    fetchBeneficiaries()
    .then(response => response.json())
    .then(response => {
      response = response.beneficiaries;
      if (!response.length) {
        Alert.alert("Please go to Cowin website and create Beneficiary.");
        return;
      }
      if (response.length > 1) {
        let tbeneficiariesList = []
        for(i=0; i < response.length; i++) {
          tbeneficiariesList.push({
            text: response[i].name,
            key: response[i].beneficiary_reference_id
          });
        }
        setBeneficiariesList(tbeneficiariesList);
        setBeneficiaryModalVisible(true);
      } else {
        setSelectBeneficiary({
          text: response[0].name,
          key: response[0].beneficiary_reference_id
        });
        startApptFetch();
      }
    })
    .catch(e => {
      if (debug) console.log(e);
    })
  };

  let startApptFetch = () => {
    setBeneficiaryModalVisible(0);
    apptFetch(apptFilters);
  };

  let fetchBeneficiaries = () => {
    let beneficiaries = fetch(createURL("/v2/appointment/beneficiaries"), {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "authorization": "Bearer " + token,
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-gpc": "1",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
      },
      "referrer": "https://selfregistration.cowin.gov.in/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": null,
      "method": "GET",
      "mode": "cors",
      "credentials": "include"
    });

    return beneficiaries;
  };

  let apptFetch = (apptFilters) => {
    const min_age = (selectedAge) ? selectedAge : apptFilters.min_age;
    const pincodes = apptFilters.pincodes;
    const dateRange = apptFilters.dateRange;
    const vaccineChoice = selectedVaccine;
    prependCopy(`** Cycle ${apptFilters.cycleCounter} **`)

    let mergedArray = pincodes.map(pincode => {
      return expandArr(pincode, [...dateRange]);
    });
    mergedArray = [].concat.apply([], mergedArray);

    Promise.all(mergedArray.map(item => {
        // https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByPin?pincode=560076&date=30-05-2021&vaccine=COVAXIN

        const url = createURL(`/v2/appointment/sessions/calendarByPin?pincode=${item.pincode}&date=${item.dateSelect}`);

        if (vaccineChoice) {
          url = url + '&VACCINE=' + vaccineChoice;
        }

        return fetch(url, {
          "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "authorization": "Bearer " + token,
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "sec-gpc": "1",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
          },
          "referrer": "https://selfregistration.cowin.gov.in/",
          "referrerPolicy": "strict-origin-when-cross-origin",
          "body": null,
          "method": "GET",
          "mode": "cors",
          "credentials": "include"
        }).then(response => response.json());
      }))
      .then(responses => {
        responses.forEach(response => {
          const a = response;
          for (c = 0; c < a.centers.length; c++) {
            for (s = 0; s < a.centers[c].sessions.length; s++) {
              if (a.centers[c].sessions[s].min_age_limit == min_age && a.centers[c].sessions[s].available_capacity > 0) {
                var str = "Pincode: " + a.centers[c].pincode + " > Center name: " + a.centers[c].name + " > Capacity: " + a.centers[c].sessions[s].available_capacity + " > Date: " + a.centers[c].sessions[s].date;
                // if (debug) console.log(str);
                globalResponseArray.push(str);
              }
            }
          }
        });
        console.log(`Cycle Number ${apptFilters.cycleCounter}`);
        if (debug) {
          prependCopy(JSON.stringify(globalResponseArray, null, 2));
          console.log(globalResponseArray);
        }
        if (globalResponseArray.length) play_alarm();
        globalResponseArray = [];
        apptFilters.cycleCounter++;
        sleepNow(30, apptFilters.cycleCounter)
          .then(() => apptFetch(apptFilters));
      })
      .catch(error => {
        console.log('Atleast one request failed');
        prependCopy('Trying to login again');
        sleepNow(30, apptFilters.cycleCounter)
          .then(() => {
            console.log('You got logged out, please start again');
            init()
          });
      });
  };

  let generateErrorAlert = (errorMessage) => {
    Alert.alert("Error", errorMessage);
  };

  let validate_variables = () => {
    console.log(pincodes, typeof pincodes, mobile, typeof mobile, noOfDays, typeof noOfDays, dateSelect, typeof dateSelect);
    if (!pincodes || !mobile || !noOfDays || !dateSelect) {
      generateErrorAlert("Please fill in values in the fields!");
      return false;
    }
    if (!pincodes || !pincodes.length) {
      generateErrorAlert("Please enter pincodes as: 560076, 560078, 560001 !");
      return false;
    }
    if (!pincodes.split(",").length) {
      generateErrorAlert("Please enter pincodes as: 560076, 560078, 560001 !");
      return false;
    }
    apptFilters.pincodes = pincodes.split(",");
    apptFilters.pincodes = apptFilters.pincodes.map((item) => {
      item = item.trim();
      if (/^[1-9]{1}[0-9]{2}[0-9]{3}$/.test(item))
        return item;
      else
        return null;
    });
    apptFilters.pincodes = filter_array(apptFilters.pincodes);
    if (!apptFilters.pincodes.length) {
      generateErrorAlert("Please enter pincodes as: 560076, 560078, 560001 !");
      return false;
    }

    if (!/^\d{10}$/.test(mobile.trim())) {
      generateErrorAlert("Please enter only 10 digit mobile number. No +91 or any country code!");
      return false;
    }
    apptFilters.mobile = mobile.trim();
    if (noOfDays < 1 || noOfDays > 3) {
      generateErrorAlert("Please enter no of days between 1-3!");
      return false;
    }
    if (!(dateSelect instanceof Date)) {
      generateErrorAlert("Error Code: 112. Tweet to @debarko");
      return false;
    }
    apptFilters.dateRange = [];
    for (i = 0; i < noOfDays; i++) {
      let nextDate = new Date(dateSelect.getTime());
      nextDate.setDate(nextDate.getDate() + i);
      apptFilters.dateRange.push(convertDate(nextDate));
    }
    if (debug) console.log(apptFilters);
    return true;
  };

  let init = (refresh_filters) => {
    Keyboard.dismiss();
    if (refresh_filters && !validate_variables()) {
      return false;
    }
    const number = apptFilters.mobile;
    generateOTP(number)
      .then(response => {
        console.log(response);
        response.json()
      })
      .then(response => {
        let subscription = SmsListener.addListener(message => {
          console.log(message);
          let verificationCodeRegex = /Your OTP to register\/access CoWIN is ([\d]{6})/;
          if (debug) console.log("OTP", message.body.match(verificationCodeRegex)[1]);
          if (verificationCodeRegex.test(message.body)) {
            let otp = message.body.match(verificationCodeRegex)[1];
            subscription.remove()
            confirmOTP(response.txnId, otp)
            .then(response => response.json())
            .then(response => {
              if (debug) console.log(response);
              token = response.token;
              beneficiariesHandling();
            })
            .catch(e => {
              if (debug) console.log(e);
            });
          }        
        });
        return 
      })
      .catch(error => {
        console.log('Some error');
        if (debug) {
          console.log(error);
        }
      });
  };

  let getRecaptcha = () => {
    let appt = fetch(createURL("/v2/auth/getRecaptcha"), {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "authorization": "Bearer " + token,
        "cache-control": "no-cache",
        "content-type": "application/json",
        "pragma": "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-gpc": "1"
      },
      "referrer": "https://selfregistration.cowin.gov.in/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": "{}",
      "method": "POST",
      "mode": "cors"
    });

    return appt;
  };

  let scheduleAppointment = (session_id, dose_number, slot, captcha_string) => {
    let scheduleBook = fetch(createURL("/v2/appointment/schedule"), {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "authorization": "Bearer " + token,
        "cache-control": "no-cache",
        "content-type": "application/json",
        "pragma": "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-gpc": "1"
      },
      "referrer": "https://selfregistration.cowin.gov.in/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": "{\"center_id\":246598,\"session_id\":\"" + session_id + "\",\"beneficiaries\":[\""+ selectBeneficiary.value +"\"],\"slot\":\"" + slot +"\",\"captcha\":\"" + captcha_string + "\",\"dose\":"+ dose_number +"}",
      "method": "POST",
      "mode": "cors",
      "credentials": "include"
    });

    return scheduleBook;
  }

  React.useEffect(() => {
    requestReadSmsPermission();
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollview}>
        <StatusBar />
        <KeepAwake />
        <View>
          <Text style={styles.label}>Pincodes</Text>
          <TextInput
            style={styles.input}
            value={pincodes}
            placeholder="Enter pincodes here like 560076,560078 etc"
            onChangeText={onChangePincodes} />
        </View>
        <View>
          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            value={mobile}
            placeholder="Enter mobile here like 9831098310"
            onChangeText={onChangeMobile} />
        </View>
        <View>
          <Text style={styles.label}>Select start date?</Text>
          <DatePicker 
            date={dateSelect}
            androidVariant="nativeAndroid"
            mode="date"
            onDateChange={onChangeDateSelect}
            />
        </View>
        <View>
          <Text style={styles.label}>Number of days to search for? (with and after above date)</Text>
          <TextInput
            style={styles.input}
            value={noOfDays}
            defaultValue="1"
            keyboardType="number-pad"
            placeholder="Number of days"
            onChangeText={onChangeNoOfDays} />
        </View>
        <View>
          <Text style={styles.label}>Select which age range and above?</Text>
          <RadioButton
            selectedOption={selectedAge}
            onSelect={onSelectAge}
            options={ageList}
          />
        </View>
        <View>
          <Text style={styles.label}>Select Vaccine?</Text>
          <RadioButton
            selectedOption={selectedVaccine}
            onSelect={onSelectVaccine}
            options={vaccineList}
          />
        </View>
        <View>
          <Text style={styles.label}>Dose Number?</Text>
          <RadioButton
            selectedOption={selectedDose}
            onSelect={onSelectDose}
            options={doseList}
          />
        </View>
        <View>
          <Button
            title="Start Searching"
            onPress={init}
          />
        </View>
        <Markdown 
          style={{
            body: {
              color: '#c9d1d9', 
              fontSize: 14,
              backgroundColor: '#161b22',
              marginTop: 10,
              paddingLeft: 10,
              borderWidth: 1,
              borderColor: "#c9d1d9",
              borderRadius: 5
            }
          }}
        >
          {copy}
        </Markdown>
        <Modal
          animationType="fade"
          transparent={true}
          visible={beneficiaryModalVisible}
          onRequestClose={() => {
            Alert.alert("Modal has been closed.");
            setModalVisible(!modalVisible);
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text>Whom are you booking for:</Text>
              <RadioButton
                selectedOption={selectBeneficiary}
                onSelect={onSelect}
                options={beneficiariesList}
              />
              <Text>{"\n"}</Text>
              <Pressable
                disabled={selectBeneficiary == null}
                style={[styles.button, styles.buttonClose]}
                onPress={startApptFetch}
              >
                <Text style={styles.textStyle}>Select</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* <Modal
          animationType="fade"
          transparent={true}
          visible={captchaModalVisible}
          onRequestClose={() => {
            Alert.alert("Modal has been closed.");
            setModalVisible(!modalVisible);
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text>Please enter the captcha:</Text>
              imagetag
              //todo: enter the captcha String
              // create all variables inside this modal
              <Text>{"\n"}</Text>
              textinput
              <Pressable
                disabled={captchaEntered == null}
                style={[styles.button, styles.buttonClose]}
                onPress={bookAppt}
              >
                <Text style={styles.textStyle}>Select</Text>
              </Pressable>
            </View>
          </View>
        </Modal> */}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    borderColor: "#c9d1d9"
  },
  container: {
    flex: 1,
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#0d1117",
    padding: 10
  },
  scrollview:{
    height: '100%'
  },
  label: {
    color: '#c9d1d9'
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22
  },
  modalView: {
    margin: 10,
    color: "#c9d1d9",
    minWidth: 150,
    backgroundColor: "#ccc",
    borderRadius: 5,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5
  },
  button: {
    borderRadius: 5,
    padding: 10,
    elevation: 2
  },
  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "#2196F3",
  },
});

export default App;