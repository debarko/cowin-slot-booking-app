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
  const [beneficiaryModalVisible, setBeneficiaryModalVisible] = React.useState(false);
  const [copy, setCopy] = React.useState('');
  const [beneficiariesList, setBeneficiariesList] = React.useState([]);
  
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
    console.log(selectBeneficiary);
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


  // UTIL Functions
  let prependCopy = (text) => {
    markdownCopy = text + '\n' + markdownCopy
    setCopy(markdownCopy);
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
  }

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
    if (debug) console.log(url);
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
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
      },
      "referrer": "https://selfregistration.cowin.gov.in/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": "{\"secret\":\"U2FsdGVkX1/MBQt7VwMJ0bJcs8ylYF/7gb5xh4MVghtdzui/tlbj0Lg9CbUBzAQKA16cGI2s4merLTECWUpK1w==\",\"mobile\":" + number + "}",
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
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
      },
      "referrer": "https://selfregistration.cowin.gov.in/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": "{\"otp\":\"" + SHA256(otpValue) + "\",\"txnId\":\"" + txnId + "\"}",
      "method": "POST",
      "mode": "cors",
      "credentials": "omit"
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
        console.log(response);
        console.log(beneficiariesList);
        setBeneficiaryModalVisible(true);
      } else {
        selectBeneficiary = 1;
      }
      // TODO - Setup a function here to call this next one
      // Call it from event and this above eles case
      // apptFetch(apptFilters);
    })
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
    const min_age = apptFilters.min_age;
    const pincodes = apptFilters.pincodes;
    const dateRange = apptFilters.dateRange;
    prependCopy(`** Cycle ${apptFilters.cycleCounter} **`)

    let mergedArray = pincodes.map(pincode => {
      return expandArr(pincode, [...dateRange]);
    });
    mergedArray = [].concat.apply([], mergedArray);

    Promise.all(mergedArray.map(item => {
        // https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByPin?pincode=560076&date=30-05-2021&vaccine=COVAXIN

        const url = createURL(`/v2/appointment/sessions/calendarByPin?pincode=${item.pincode}&date=${item.dateSelect}`);

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
      .then(response => response.json())
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
              token = response.token;
              beneficiariesHandling();
            });
          }        
        });
        return 
      });
  }

  // Vendor Library Section


  // /**
  // * Secure Hash Algorithm (SHA256)
  // * http://www.webtoolkit.info/
  // * Original code by Angel Marin, Paul Johnston
  // **/

  function SHA256(s) {
    var chrsz = 8;
    var hexcase = 0;

    function safe_add(x, y) {
      var lsw = (x & 0xFFFF) + (y & 0xFFFF);
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return (msw << 16) | (lsw & 0xFFFF);
    }

    function S(X, n) {
      return (X >>> n) | (X << (32 - n));
    }

    function R(X, n) {
      return (X >>> n);
    }

    function Ch(x, y, z) {
      return ((x & y) ^ ((~x) & z));
    }

    function Maj(x, y, z) {
      return ((x & y) ^ (x & z) ^ (y & z));
    }

    function Sigma0256(x) {
      return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
    }

    function Sigma1256(x) {
      return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
    }

    function Gamma0256(x) {
      return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
    }

    function Gamma1256(x) {
      return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
    }

    function core_sha256(m, l) {
      var K = new Array(0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2);
      var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
      var W = new Array(64);
      var a, b, c, d, e, f, g, h, i, j;
      var T1, T2;

      m[l >> 5] |= 0x80 << (24 - l % 32);
      m[((l + 64 >> 9) << 4) + 15] = l;

      for (var i = 0; i < m.length; i += 16) {
        a = HASH[0];
        b = HASH[1];
        c = HASH[2];
        d = HASH[3];
        e = HASH[4];
        f = HASH[5];
        g = HASH[6];
        h = HASH[7];

        for (var j = 0; j < 64; j++) {
          if (j < 16) W[j] = m[j + i];
          else W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);

          T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
          T2 = safe_add(Sigma0256(a), Maj(a, b, c));

          h = g;
          g = f;
          f = e;
          e = safe_add(d, T1);
          d = c;
          c = b;
          b = a;
          a = safe_add(T1, T2);
        }

        HASH[0] = safe_add(a, HASH[0]);
        HASH[1] = safe_add(b, HASH[1]);
        HASH[2] = safe_add(c, HASH[2]);
        HASH[3] = safe_add(d, HASH[3]);
        HASH[4] = safe_add(e, HASH[4]);
        HASH[5] = safe_add(f, HASH[5]);
        HASH[6] = safe_add(g, HASH[6]);
        HASH[7] = safe_add(h, HASH[7]);
      }
      return HASH;
    }

    function str2binb(str) {
      var bin = Array();
      var mask = (1 << chrsz) - 1;
      for (var i = 0; i < str.length * chrsz; i += chrsz) {
        bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32);
      }
      return bin;
    }

    function Utf8Encode(string) {
      string = string.replace(/\r\n/g, '\n');
      var utftext = '';

      for (var n = 0; n < string.length; n++) {

        var c = string.charCodeAt(n);

        if (c < 128) {
          utftext += String.fromCharCode(c);
        } else if ((c > 127) && (c < 2048)) {
          utftext += String.fromCharCode((c >> 6) | 192);
          utftext += String.fromCharCode((c & 63) | 128);
        } else {
          utftext += String.fromCharCode((c >> 12) | 224);
          utftext += String.fromCharCode(((c >> 6) & 63) | 128);
          utftext += String.fromCharCode((c & 63) | 128);
        }

      }

      return utftext;
    }

    function binb2hex(binarray) {
      var hex_tab = hexcase ? '0123456789ABCDEF' : '0123456789abcdef';
      var str = '';
      for (var i = 0; i < binarray.length * 4; i++) {
        str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
          hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
      }
      return str;
    }

    s = Utf8Encode(s);
    return binb2hex(core_sha256(str2binb(s), s.length * chrsz));
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
              <Text>Select Beneficiary:</Text>
              

              <RadioButton
                selectedOption={selectBeneficiary}
                onSelect={onSelect}
                options={beneficiariesList}
              />







              <Text>{"\n"}</Text>
              <Pressable
                disabled={selectBeneficiary == null}
                style={[styles.button, styles.buttonClose]}
                onPress={() => setBeneficiaryModalVisible(!beneficiaryModalVisible)}
              >
                <Text style={styles.textStyle}>Select</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
    paddingTop: 10
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